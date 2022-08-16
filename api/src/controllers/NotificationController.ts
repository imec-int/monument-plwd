import { ICreateNotificationBody } from './../models/Notification';
import { NotificationRepository } from './../repositories/NotificationRepository';
import Koa from 'koa';
import logger from '../utils/logger';

export class NotificationController {
    constructor(private notificationRepository: NotificationRepository) {}

    getNotifications = async (ctx: Koa.ParameterizedContext) => {
        try {
            const notifications = await this.notificationRepository.get();
            ctx.status = 200;
            ctx.body = { success: true, data: notifications };
        } catch (err) {
            logger.error(`Failed to fetch calendarEvents: ${err}`);
            ctx.status = 500;
            ctx.body = { success: false };
        }
    };

    postNotification = async (ctx: Koa.ParameterizedContext) => {
        const body = ctx.request.body as ICreateNotificationBody;

        try {
            await this.notificationRepository.insert(body);
            ctx.status = 200;
            ctx.body = { success: true };
        } catch (err) {
            logger.error(`Failed to insert notification: ${body}`);
            ctx.status = 500;
            ctx.body = { success: false };
        }
    };
}
