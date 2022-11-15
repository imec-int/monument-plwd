import { UserRole } from './../models/UserRole';
import { CarecircleMemberRepository } from 'src/repositories/CarecircleMemberRepository';
import { PlwdRepository } from 'src/repositories/PlwdRepository';
import { UserRepository } from 'src/repositories/UserRepository';
import Koa, { Middleware } from 'koa';
import * as yup from 'yup';
import logger from '../utils/logger';
import { IUser } from 'src/models/User';
import { DefaultAuthorizationService } from '../auth/AuthorizationService';
import { Auth0Service } from 'src/services/RestApiBasedAuth0Service';
import { ICarecircleMember } from 'src/models/CarecircleMember';
import { pictureValidationSchema } from '../utils/validation';

const requestUserContext = yup
    .object({
        id: yup.string().required(),
    })
    .required();

export const createUserValidationSchema = yup.object({
    user: requestUserContext,
    body: yup
        .object({
            user: yup
                .object({
                    auth0Id: yup.string(),
                    email: yup.string().required(),
                    firstName: yup.string().required(),
                    lastName: yup.string().required(),
                    phone: yup.string().required(),
                    picture: pictureValidationSchema,
                    role: yup.string().required(),
                })
                .required(),
        })
        .required(),
});

export const updateUserValidationSchema = yup.object({
    user: requestUserContext,
    body: yup
        .object({
            user: yup
                .object({
                    id: yup.string(),
                    email: yup.string().required(),
                    firstName: yup.string().required(),
                    lastName: yup.string().required(),
                    phone: yup.string().required(),
                    picture: pictureValidationSchema,
                    role: yup.string().required(),
                })
                .required(),
        })
        .required(),
});

export class UserAuthorizationService {
    constructor(private readonly authService: DefaultAuthorizationService) {}

    isAuthorizedAsAdmin: Middleware = async (ctx, next) => {
        const { user: requestingUser } = ctx;

        const isAuthorized = await this.authService.isAuthorizedAsAdmin(requestingUser);
        if (isAuthorized.isUnauthorized()) {
            ctx.status = isAuthorized.status;
            ctx.body = isAuthorized.message;
            return;
        }

        await next();
    };

    isAuthorizedToAccessUser: Middleware = async (ctx, next) => {
        const { user: requestingUser } = ctx;
        const { auth0Id } = ctx.params;

        const isAuthorized = await this.authService.hasAccessToUserByAuth0Id(requestingUser, auth0Id);
        if (isAuthorized.isUnauthorized()) {
            ctx.status = isAuthorized.status;
            ctx.body = isAuthorized.message;
            return;
        }

        await next();
    };

    canUpdateUser: Middleware = async (ctx, next) => {
        const { user: requestingUser } = ctx;
        const { id } = ctx.params;

        const isAuthorized = await this.authService.hasAccessToUserById(requestingUser, id);
        if (isAuthorized.isUnauthorized()) {
            ctx.status = isAuthorized.status;
            ctx.body = isAuthorized.message;
            return;
        }

        await next();
    };
}

export class UserController {
    constructor(
        private plwdRepository: PlwdRepository,
        private userRepository: UserRepository,
        private carecircleMemberRepository: CarecircleMemberRepository,
        private auth0Service: Auth0Service
    ) {}

    private addPlwdInfoToCarecircle = async (carecircle: ICarecircleMember) => {
        const { plwdId, ...rest } = carecircle;
        const plwd = await this.plwdRepository.get(plwdId);

        return {
            ...rest,
            plwd,
        };
    };

    getMe = async (ctx: Koa.ParameterizedContext) => {
        ctx.status = 200;
        ctx.body = ctx.user;
    };

    deleteUser = async (ctx: Koa.ParameterizedContext) => {
        const { id } = ctx.params;

        try {
            await this.userRepository.deleteById(id);
            ctx.status = 200;
            ctx.body = { success: true };
        } catch (err) {
            logger.error(`Failed to delete user [${id}]`, err);
            ctx.status = 500;
            ctx.body = { success: false };
        }
    };

    private hasCompletedOnboarding = ({ user, carecircles }) => {
        // Check if user role is primary caretaker
        if (user.role === UserRole.PRIMARY_CARETAKER) {
            // Find if the user id is part of one of the plwd caretakerid inside the carecircle
            const caretakerIds = carecircles.map((carecircle) => carecircle.plwd.caretakerId);
            return caretakerIds.includes(user.id);
        }
        return true;
    };

    private async getCarecirclesForAdmin() {
        const allPlwd = await this.plwdRepository.getAll();
        return allPlwd.map((p) => ({ plwd: p, id: p.id }));
    }

    private async getCarecirclesForNonAdmins(user: IUser) {
        // Get the carecircles that the user belongs to aside from being caretaker
        const carecircleMemberships = user?.id ? await this.carecircleMemberRepository.getByUserId(user.id) : [];
        const carecircleMembershipsWithPlwdInfo = await Promise.all(
            carecircleMemberships.map(this.addPlwdInfoToCarecircle)
        );

        return carecircleMembershipsWithPlwdInfo;
    }

    getByAuth0Id = async (ctx: Koa.ParameterizedContext) => {
        const { auth0Id } = ctx.params;

        try {
            const user = await this.userRepository.getUserByAuth0Id(auth0Id);
            const carecircles =
                user.role === UserRole.ADMIN
                    ? await this.getCarecirclesForAdmin()
                    : await this.getCarecirclesForNonAdmins(user);
            const hasCompletedOnboarding = this.hasCompletedOnboarding({ user, carecircles });

            ctx.status = 200;
            ctx.body = {
                success: true,
                data: {
                    ...user,
                    hasCompletedOnboarding,
                    carecircles,
                },
            };
        } catch (err) {
            logger.error(`Failed to fetch user by id`, err);
            ctx.status = 500;
            ctx.body = { success: false };
        }
    };

    create = async (ctx: Koa.ParameterizedContext) => {
        const { user: data } = ctx.request.body as { user: IUser };

        try {
            const existingUser = await this.userRepository.getUserByEmail(data.email);
            if (existingUser) {
                ctx.status = 409;
                ctx.message = `User with ${data.email} already exists`;

                return;
            }

            const createdUser = await this.userRepository.insert(data);

            ctx.status = 200;
            ctx.body = { success: true, data: createdUser };
        } catch (err) {
            logger.error('Failed to create user', err);
            ctx.status = 500;
            ctx.body = { success: false };
        }
    };

    update = async (ctx: Koa.ParameterizedContext) => {
        const { user: data } = ctx.request.body as { user: IUser };
        const { id } = ctx.params;

        try {
            const existingUser = await this.userRepository.getUserById(id);

            if (existingUser.email !== data.email) {
                ctx.status = 409;
                ctx.message = 'Cannot update email of a user';

                return;
            }

            const updatedUser = await this.userRepository.update(data);

            ctx.status = 200;
            ctx.body = { success: true, data: updatedUser };
        } catch (err) {
            logger.error('Failed to update user', err);
            ctx.status = 500;
            ctx.body = { success: false };
        }
    };
}
