import { Affiliation, ICarecircleMemberBody } from './../models/CarecircleMember';
import { CarecircleMemberRepository } from 'src/repositories/CarecircleMemberRepository';
import { randomUUID } from 'crypto';
import { IPlwdCreateBody, PlwdRepository } from 'src/repositories/PlwdRepository';
import { UserRepository } from 'src/repositories/UserRepository';
import Koa, { Middleware } from 'koa';
import * as yup from 'yup';
import logger from '../utils/logger';
import { IPlwd } from 'src/models/Plwd';
import { IUser } from 'src/models/User';
import { DefaultAuthorizationService } from '../auth/AuthorizationService';
import { pictureValidationSchema } from '../utils/validation';

const requestUserContext = yup
    .object({
        id: yup.string().required(),
    })
    .required();

const addressSchemaObject = yup.object({
    description: yup.string().optional(),
    geometry: yup
        .object({
            location: yup.object({
                lat: yup.number().required(),
                lng: yup.number().required(),
            }),
        })
        .required(),
});

export const getPlwdValidationSchema = yup.object({
    user: requestUserContext,
    params: yup
        .object({
            plwdId: yup.string().required(),
        })
        .required(),
});

export const createPlwdValidationSchema = yup.object({
    user: requestUserContext,
    body: yup
        .object({
            address: addressSchemaObject.required(),
            caretakerId: yup.string().required(),
            email: yup.string().email().nullable(),
            firstName: yup.string().required(),
            lastName: yup.string().required(),
            phone: yup.string().nullable(),
            picture: pictureValidationSchema,
            watchId: yup.string().nullable(),
        })
        .required(),
});

export const updatePlwdValidationSchema = yup.object({
    user: requestUserContext,
    body: yup
        .object({
            address: addressSchemaObject.required(),
            caretakerId: yup.string().required(),
            email: yup.string().email().nullable(),
            firstName: yup.string().required(),
            id: yup.string().required(),
            lastName: yup.string().required(),
            phone: yup.string().nullable(),
            picture: pictureValidationSchema,
            watchId: yup.string().nullable(),
        })
        .required(),
});

export class PlwdAuthorizationService {
    constructor(private readonly authService: DefaultAuthorizationService) {}

    isAuthorizedForViewingPlwd: Middleware = async (ctx, next) => {
        const { user: requestingUser } = ctx;
        const { plwdId } = ctx.params;

        const isAuthorized = await this.authService.hasAccessToPlwd({
            requestingUser,
            plwdId,
        });
        if (isAuthorized.isUnauthorized()) {
            ctx.status = isAuthorized.status;
            ctx.body = isAuthorized.message;
            return;
        }

        await next();
    };

    isAuthorizedForCreatingPlwd: Middleware = async (ctx, next) => {
        const { user: requestingUser } = ctx;

        const isAuthorized = await this.authService.hasAdminOrPrimaryCaretakerRole(requestingUser);
        if (isAuthorized.isUnauthorized()) {
            ctx.status = isAuthorized.status;
            ctx.body = isAuthorized.message;
            return;
        }

        await next();
    };

    isAuthorizedForManagingPlwd: Middleware = async (ctx, next) => {
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

export class PlwdController {
    constructor(
        private plwdRepository: PlwdRepository,
        private userRepository: UserRepository,
        private carecircleMemberRepository: CarecircleMemberRepository
    ) {}

    getPlwdById = async (ctx: Koa.ParameterizedContext) => {
        const { plwdId } = ctx.params;

        try {
            const plwd = await this.plwdRepository.get(plwdId);
            const caretaker = plwd ? await this.userRepository.getUserById(plwd.caretakerId) : null;
            if (plwd && caretaker) {
                const data = mapPlwdToViewModel(plwd, caretaker);
                ctx.status = 200;
                ctx.body = { success: true, data };
            } else {
                throw new Error(`Plwd or caretaker not found for plwdId: [${plwdId}]`);
            }
        } catch (err) {
            logger.error(`Failed to get plwd [${plwdId}]`, err);
            ctx.status = 500;
            ctx.body = { success: false, data: null };
        }
    };

    createPlwd = async (ctx: Koa.ParameterizedContext) => {
        const body = ctx.request.body as IPlwdCreateBody;

        try {
            const newUser = {
                ...body,
                id: randomUUID(),
            };
            const plwd = await this.plwdRepository.insert(newUser);
            const carecircleMemberBody = {
                affiliation: Affiliation.PRIMARY_CARETAKER,
                plwdId: plwd.id,
                userId: plwd.caretakerId,
                permissions: '[]',
                id: randomUUID(),
            } as ICarecircleMemberBody;
            await this.carecircleMemberRepository.addMember(carecircleMemberBody);
            const caretaker = await this.carecircleMemberRepository.getByUserIdAndPlwdId(
                carecircleMemberBody.userId,
                carecircleMemberBody.plwdId
            );
            ctx.status = 200;
            ctx.body = { success: true, data: { ...plwd, caretaker } };
        } catch (err) {
            logger.error('Failed to create plwd', err);
            ctx.status = 500;
            ctx.body = { success: false };
        }
    };

    updatePlwd = async (ctx: Koa.ParameterizedContext) => {
        const body = ctx.request.body as unknown as IPlwd;

        try {
            const user = await this.plwdRepository.update(body);
            ctx.status = 200;
            ctx.body = { success: true, data: user };
        } catch (err) {
            logger.error(`Failed to update plwd [${body.id}]`, err);
            ctx.status = 500;
            ctx.body = { success: false };
        }
    };
}

const mapPlwdToViewModel = (plwd: IPlwd, caretaker: IUser) => {
    if (!plwd) return null;

    return {
        ...plwd,
        caretaker,
    };
};
