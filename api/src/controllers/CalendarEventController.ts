import { CalendarEvent } from '../models/CalendarEvent';
import { CalendarEventRepository } from '../repositories/CalendarEventRepository';
import Koa, { Middleware } from 'koa';
import * as yup from 'yup';
import logger from '../utils/logger';
import { DefaultAuthorizationService } from 'src/auth/AuthorizationService';
import { NotificationRepository } from '../repositories/NotificationRepository';

const requestUserContext = yup
    .object({
        id: yup.string().required(),
    })
    .required();

export const createCalendarEventValidationSchema = yup.object({
    user: requestUserContext,
    body: yup
        .object({
            carecircleMemberIds: yup.array().of(yup.string()).required(),
            externalContactIds: yup.array().of(yup.string()).required(),
        })
        .required(),
});

export class CalendarEventAuthorizationService {
    constructor(private readonly authService: DefaultAuthorizationService) {}

    canAccessCalendar: Middleware = async (ctx, next) => {
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

    canManageCalendar: Middleware = async (ctx, next) => {
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

export class CalendarEventController {
    constructor(
        private calendarEventRepository: CalendarEventRepository,
        private readonly notificationRepository: NotificationRepository
    ) {}

    postCalendarEvent = async (ctx: Koa.ParameterizedContext) => {
        const body = ctx.request.body as CalendarEvent;

        try {
            const calendarEvent = await this.calendarEventRepository.insert(body);
            ctx.status = 200;
            ctx.body = { success: true, data: calendarEvent };
        } catch (err) {
            logger.error('Failed to insert calendarEvent:', { err, body });
            ctx.status = 500;
            ctx.body = { success: false, data: undefined };
        }
    };

    patchCalendarEvent = async (ctx: Koa.ParameterizedContext) => {
        const body = ctx.request.body as CalendarEvent;

        try {
            const calendarEvent = await this.calendarEventRepository.update(body);
            ctx.status = 200;
            ctx.body = { success: true, data: calendarEvent };
        } catch (err) {
            logger.error('Failed to update calendarEvent:', { err, body });
            ctx.status = 500;
            ctx.body = { success: false, data: undefined };
        }
    };

    getCalendarEvents = async (ctx: Koa.ParameterizedContext) => {
        try {
            const calendarEvents = await this.calendarEventRepository.get();
            ctx.status = 200;
            ctx.body = { success: true, data: calendarEvents };
        } catch (err) {
            logger.error('Failed to fetch calendarEvents:', err);
            ctx.status = 500;
            ctx.body = { success: false, data: undefined };
        }
    };

    getCalendarEventsForPlwd = async (ctx: Koa.ParameterizedContext) => {
        const { plwdId } = ctx.params;

        try {
            const calendarEvents = await this.calendarEventRepository.getByPlwdId(plwdId);
            ctx.status = 200;
            ctx.body = { success: true, data: calendarEvents };
        } catch (err) {
            logger.error('Failed to fetch calendarEvents:', err);
            ctx.status = 500;
            ctx.body = { success: false, data: undefined };
        }
    };

    delete = async (ctx: Koa.ParameterizedContext) => {
        const { eventId } = ctx.params;

        try {
            await this.notificationRepository.deleteAllForEvent(eventId);
            await this.calendarEventRepository.deleteById(eventId);
            ctx.status = 200;
            ctx.body = { success: true, data: { id: eventId } };
        } catch (err) {
            logger.error('Failed to delete calendarEvent:', err);
            ctx.status = 500;
            ctx.body = { success: false, data: undefined };
        }
    };
}
