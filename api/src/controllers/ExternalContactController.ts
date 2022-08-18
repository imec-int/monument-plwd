import { ICreateExternalContactBody } from './../models/ExternalContact';
import { ExternalContactsRepository } from './../repositories/ExternalContactsRepository';
import Koa, { Middleware } from 'koa';
import * as yup from 'yup';
import logger from '../utils/logger';
import { DefaultAuthorizationService } from 'src/auth/AuthorizationService';

const requestUserContext = yup
    .object({
        id: yup.string().required(),
    })
    .required();

export const createExternalContactValidationSchema = yup.object({
    user: requestUserContext,
    body: yup
        .object({
            affiliation: yup.string().required(),
            email: yup.string().required(),
            firstName: yup.string().required(),
            lastName: yup.string().required(),
            phone: yup.string().required(),
            plwdId: yup.string().required(),
        })
        .required(),
});

export class ExternalContactControllerAuthorizationService {
    constructor(private readonly authService: DefaultAuthorizationService) {}

    canAccessExternalContactsForPlwd: Middleware = async (ctx, next) => {
        const { user: requestingUser } = ctx;
        const { plwdId } = ctx.params;

        const isAuthorized = await this.authService.isAuthorizedForActionOnPlwd(
            requestingUser,
            plwdId,
            this.authService.canAccessCalendar
        );
        if (isAuthorized.isUnauthorized()) {
            ctx.status = isAuthorized.status;
            ctx.body = isAuthorized.message;
            return;
        }

        await next();
    };

    canManageExternalContactsForPlwd: Middleware = async (ctx, next) => {
        const { user: requestingUser } = ctx;
        const { plwdId } = ctx.params;

        const isAuthorized = await this.authService.isAuthorizedForActionOnPlwd(
            requestingUser,
            plwdId,
            this.authService.canManageCalendar
        );
        if (isAuthorized.isUnauthorized()) {
            ctx.status = isAuthorized.status;
            ctx.body = isAuthorized.message;
            return;
        }

        await next();
    };
}

export class ExternalContactController {
    constructor(private externalContactRepository: ExternalContactsRepository) {}

    createExternalContact = async (ctx: Koa.ParameterizedContext) => {
        const body = ctx.request.body as ICreateExternalContactBody;

        try {
            const existingMailExternalContact = await this.externalContactRepository.getByMailAndPlwdId(body);
            const existingPhoneExternalContact = await this.externalContactRepository.getByPhoneAndPlwdId(body);
            if (existingMailExternalContact) {
                ctx.status = 409;
                ctx.message = `[existing-email]: External contact with email ${body.email} already exists`;

                return;
            }

            if (existingPhoneExternalContact) {
                ctx.status = 409;
                ctx.message = `[existing-phone]: External contact with phone ${body.phone} already exists`;

                return;
            }

            const externalContact = await this.externalContactRepository.insert(body);

            ctx.status = 200;
            ctx.body = { success: true, data: externalContact };
        } catch (err) {
            logger.error(`Failed to create external contact`, err);
            ctx.status = 500;
            ctx.body = { success: false };
        }
    };

    getExternalContactsByPlwdId = async (ctx: Koa.ParameterizedContext) => {
        const { plwdId } = ctx.params;

        try {
            const data = await this.externalContactRepository.getByPlwdId(plwdId);
            ctx.status = 200;
            ctx.body = { success: true, data };
        } catch (err) {
            logger.error('Failed to fetch external contacts:', err);
            ctx.status = 500;
            ctx.body = { success: false };
        }
    };
}
