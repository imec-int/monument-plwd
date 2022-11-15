import { randomUUID } from 'crypto';
import { IUser } from 'src/models/User';
import { UserRepository } from 'src/repositories/UserRepository';
import { CarecircleMemberRepository } from 'src/repositories/CarecircleMemberRepository';
import Koa, { Middleware } from 'koa';
import * as yup from 'yup';
import logger from '../utils/logger';
import { DefaultAuthorizationService } from 'src/auth/AuthorizationService';
import { Auth0Service } from '../services/RestApiBasedAuth0Service';
import { UserRole } from '../models/UserRole';
import { Affiliation, ICarecircleMemberBody } from '../models/CarecircleMember';
import { PlwdRepository } from '../repositories/PlwdRepository';
import { MailServiceInterface } from '../services/MailService';
import { pictureValidationSchema } from '../utils/validation';

const requestUserContext = yup
    .object({
        id: yup.string().required(),
    })
    .required();

export const createCarecircleMemberValidationSchema = yup.object({
    user: requestUserContext,
    body: yup
        .object({
            affiliation: yup.string().required(),
            permissions: yup.string().required(),
            user: yup
                .object({
                    id: yup.string(),
                    email: yup.string().required(),
                    firstName: yup.string().required(),
                    lastName: yup.string().required(),
                    phone: yup.string().required(),
                    picture: pictureValidationSchema,
                    role: yup.string(),
                })
                .required(),
        })
        .required(),
});

export class CarecircleMemberAuthorizationService {
    constructor(private readonly authService: DefaultAuthorizationService) {}

    canAccessCarecircle: Middleware = async (ctx, next) => {
        const { user: requestingUser } = ctx;
        const { plwdId } = ctx.params;

        const isAuthorized = await this.authService.isAuthorizedForActionOnPlwd(
            requestingUser,
            plwdId,
            this.authService.canAccessCarecircle
        );
        if (isAuthorized.isUnauthorized()) {
            ctx.status = isAuthorized.status;
            ctx.body = isAuthorized.message;
            return;
        }

        await next();
    };

    canManageCarecircle: Middleware = async (ctx, next) => {
        const { user: requestingUser } = ctx;
        const { plwdId } = ctx.params;

        const isAuthorized = await this.authService.isAuthorizedForActionOnPlwd(
            requestingUser,
            plwdId,
            this.authService.canManageCarecircle
        );
        if (isAuthorized.isUnauthorized()) {
            ctx.status = isAuthorized.status;
            ctx.body = isAuthorized.message;
            return;
        }

        await next();
    };
}

export class CarecircleMemberController {
    constructor(
        private carecircleMemberRepository: CarecircleMemberRepository,
        private userRepository: UserRepository,
        private plwdRepository: PlwdRepository,
        private readonly auth0Service: Auth0Service,
        private readonly mailService: MailServiceInterface
    ) {}

    getByPlwdId = async (ctx: Koa.ParameterizedContext) => {
        const { plwdId } = ctx.params;

        try {
            const data = await this.carecircleMemberRepository.getMembers(plwdId);
            ctx.status = 200;
            ctx.body = { success: true, data };
        } catch (err) {
            logger.error('Failed to fetch carecircle members:', err);
            ctx.status = 500;
            ctx.body = { success: false };
        }
    };

    delete = async (ctx: Koa.ParameterizedContext) => {
        const { plwdId, id } = ctx.params;

        try {
            const carecircleMembership = await this.carecircleMemberRepository.getById(id);

            if (!carecircleMembership) {
                ctx.status = 200;
                ctx.body = { success: true, data: { id } };

                return;
            }

            if (carecircleMembership.affiliation === Affiliation.PRIMARY_CARETAKER) {
                ctx.status = 403;
                ctx.body = 'Not allowed to delete a primary caretaker from a carecirlce';

                return;
            }

            await this.carecircleMemberRepository.removeMember(plwdId, id);

            ctx.status = 200;
            ctx.body = { success: true, data: { id } };
        } catch (err) {
            logger.error(`Failed to remove user [${id}] from carecircle of PLWD [${plwdId}]`, err);
            ctx.status = 500;
            ctx.body = { success: false };
        }
    };

    create = async (ctx: Koa.ParameterizedContext) => {
        const { plwdId } = ctx.params;
        const { user, affiliation, permissions } = ctx.request.body as {
            affiliation: string;
            permissions: string;
            user: IUser;
        };

        try {
            let carecircleMemberBody: ICarecircleMemberBody;
            let _user: IUser;

            const auth0User = await this.auth0Service.getUser(user.email);

            if (auth0User) {
                // Check if the user matches with the data stored in the database
                // if the phone and email do NOT match we return an error
                // saying that the user is invalid (phone + email must match).
                const existingUser = await this.userRepository.getUserByEmail(user.email);

                if (!existingUser) {
                    await this.userRepository.insert({
                        ...user,
                        role: UserRole.USER,
                        auth0Id: auth0User.user_id,
                    });
                }

                const existingUserByEmailAndPhone = await this.userRepository.getUserByEmailAndPhone(
                    user.email,
                    user.phone
                );
                if (!existingUserByEmailAndPhone) {
                    ctx.status = 409;
                    ctx.body = '[phone-email-conflict]: Phone and email does not match';
                    ctx.message = '[phone-email-conflict]: Phone and email does not match';

                    return;
                }

                // Check if existingUser exists in the carecircle by getByUserIdAndPlwdId
                const existingUserInCarecircle = await this.carecircleMemberRepository.getByUserIdAndPlwdId(
                    existingUserByEmailAndPhone.id,
                    plwdId
                );

                // If the user exists in the carecircle we return an error
                if (existingUserInCarecircle) {
                    ctx.status = 409;
                    ctx.body = '[carecircle-member-conflict]: User already exists in the carecircle';
                    ctx.message = '[carecircle-member-conflict]: User already exists in the carecircle';

                    return;
                }

                _user = existingUserByEmailAndPhone;
                carecircleMemberBody = {
                    affiliation,
                    permissions,
                    plwdId,
                    userId: existingUserByEmailAndPhone.id,
                    id: randomUUID(),
                } as ICarecircleMemberBody;
                await this.carecircleMemberRepository.addMember(carecircleMemberBody);
            } else {
                const auth0User = {
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`,
                };
                // Create user on auth0
                await this.auth0Service.createUser(auth0User);
                const createdAuth0User = await this.auth0Service.getUser(user.email);

                if (!createdAuth0User) {
                    ctx.status = 500;
                    ctx.body = 'Failed to create auth0 account';

                    return;
                }

                const createdUser = await this.userRepository.insert({
                    ...user,
                    auth0Id: createdAuth0User?.user_id,
                    role: UserRole.USER,
                });

                _user = createdUser;
                carecircleMemberBody = {
                    affiliation,
                    permissions,
                    plwdId,
                    userId: createdUser.id,
                    id: randomUUID(),
                } as ICarecircleMemberBody;
                await this.carecircleMemberRepository.addMember(carecircleMemberBody);
            }

            const plwd = await this.plwdRepository.get(plwdId);

            if (!plwd) {
                ctx.status = 404;
                ctx.message = 'Plwd not found';

                return;
            }

            // Send an email to the user to notify that he/she was invited to a carecircle
            await this.mailService.sendCarecircleInvite({
                user,
                plwd,
            });

            ctx.status = 200;
            ctx.body = {
                success: true,
                data: {
                    ...carecircleMemberBody,
                    user: _user,
                },
            };
        } catch (err) {
            logger.error('Failed to create carecircle member', err);
            ctx.status = 500;
            ctx.body = { success: false };
        }
    };

    update = async (ctx: Koa.ParameterizedContext) => {
        const { plwdId, id } = ctx.params;
        const body = ctx.request.body as {
            affiliation: string;
            permissions: string;
            user: IUser;
        };
        const { affiliation, permissions, user } = body;

        try {
            const carecircleMemberBody = {
                affiliation,
                id,
                permissions,
                plwdId,
                userId: user.id,
            } as ICarecircleMemberBody;

            const existingUser = await this.userRepository.getUserById(user.id);
            if (!existingUser || existingUser.email !== user.email) {
                ctx.status = 409;
                ctx.message = 'Cannot update email of carecircle member';

                return;
            }

            await this.userRepository.update(user);
            await this.carecircleMemberRepository.updateMember(carecircleMemberBody);
            ctx.status = 200;
            ctx.body = { success: true, data: body };
        } catch (err) {
            logger.error(`Failed to patch carecircle member [${id}] of PLWD [${plwdId}]`, err);
            ctx.status = 500;
            ctx.body = { success: false };
        }
    };
}
