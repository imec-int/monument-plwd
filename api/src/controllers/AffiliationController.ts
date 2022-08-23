import { ICreateAffiliation } from './../models/Affiliation';
import { Affiliation } from './../models/CarecircleMember';
import { AffiliationRepository } from './../repositories/AffiliationRepository';
import Koa, { Middleware } from 'koa';
import * as yup from 'yup';
import logger from '../utils/logger';
import { DefaultAuthorizationService } from 'src/auth/AuthorizationService';

const requestUserContext = yup
    .object({
        id: yup.string().required(),
    })
    .required();

export const createAffiliationValidationSchema = yup.object({
    user: requestUserContext,
    body: yup
        .object({
            affiliation: yup.string().required(),
            plwdId: yup.string().required(),
        })
        .required(),
});

export class AffiliationControllerAuthorizationService {
    constructor(private readonly authService: DefaultAuthorizationService) {}

    canAccessAffiliationsForPlwd: Middleware = async (ctx, next) => {
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

    canManageAffiliationsForPlwd: Middleware = async (ctx, next) => {
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

export class AffiliationController {
    constructor(private affiliationRepository: AffiliationRepository) {}

    createAffiliation = async (ctx: Koa.ParameterizedContext) => {
        const body = ctx.request.body as ICreateAffiliation;

        const affiliationLowerCase = body.affiliation.toLocaleLowerCase();

        try {
            const plwdAffiliations = await this.affiliationRepository.getByPlwdId(body.plwdId);
            const existingAffiliation = plwdAffiliations.filter(
                (a) => a.affiliation.toLocaleLowerCase() === affiliationLowerCase
            );
            const globalAffiliations = (<any>Object).values(Affiliation).map((g) => g.toLowerCase());
            // Check also if the affiliation is not part of the global affiliations from enum Affiliations
            if (existingAffiliation.length > 0 || globalAffiliations.includes(affiliationLowerCase)) {
                ctx.status = 409;
                ctx.body = {
                    message: `[existing-affiliation]: Affiliation ${body.affiliation} already exists for plwd ${body.plwdId}`,
                };
                return;
            }

            const affiliation = await this.affiliationRepository.insert(body);

            ctx.status = 200;
            ctx.body = { success: true, data: affiliation };
        } catch (err) {
            logger.error(`Failed to create affiliation`, err);
            ctx.status = 500;
            ctx.body = { success: false };
        }
    };

    getAffiliationsByPlwdId = async (ctx: Koa.ParameterizedContext) => {
        const { plwdId } = ctx.params;

        try {
            const data = await this.affiliationRepository.getByPlwdId(plwdId);
            ctx.status = 200;
            ctx.body = { success: true, data };
        } catch (err) {
            logger.error('Failed to fetch affiliations:', err);
            ctx.status = 500;
            ctx.body = { success: false };
        }
    };
}
