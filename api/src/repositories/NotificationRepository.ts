import { Knex } from 'knex';
import { randomUUID } from 'crypto';
import logger from '../utils/logger';
import { INotification, ICreateNotificationBody } from '../models/Notification';

export interface NotificationRepository {
    deleteAllForEvent(eventId: string): Promise<void>;
    deleteById(id: string): Promise<void>;
    get(): Promise<INotification[]>;
    hasNotificationForEvent(params: ICreateNotificationBody): Promise<boolean>;
    insert(notification: ICreateNotificationBody): Promise<INotification>;
}

const mapNotificationToViewModel = (data: any): INotification => ({
    contactUserId: data.contact_user_id,
    createdAt: data.created_at,
    eventId: data.event_id,
    id: data.id,
    plwdId: data.plwd_user_id,
    type: data.type,
});

const insert = (knex: Knex) => {
    return async (notification: ICreateNotificationBody) => {
        const profiler = logger.startTimer();
        const now = new Date().toISOString();
        const id = randomUUID();
        const dbNotification = {
            id,
            plwd_user_id: notification.plwdId,
            contact_user_id: notification.contactUserId,
            event_id: notification.eventId,
            created_at: now,
            type: notification.type,
        };
        await knex('notifications').insert(dbNotification);
        profiler.done({ message: `Saved record` });
        return { ...notification, id, createdAt: now };
    };
};

const get = (knex: Knex) => {
    return async () => {
        const message = `Fetching notifications`;
        const profiler = logger.startTimer();
        const result = await knex('notifications').select('*');
        profiler.done({ message });
        return result.map(mapNotificationToViewModel);
    };
};

const hasNotificationForEvent = (knex: Knex) => {
    return async ({ eventId, contactUserId, plwdId, type }: ICreateNotificationBody) => {
        const result = await knex('notifications')
            .first('id')
            .where('event_id', eventId)
            .andWhere('contact_user_id', contactUserId)
            .andWhere('plwd_user_id', plwdId)
            .andWhere('type', type);
        return Boolean(result);
    };
};

const deleteById = (knex: Knex) => {
    return async (id: string) => {
        await knex('notifications').del().where({ id });
    };
};

const deleteAllForEvent = (knex: Knex) => {
    return async (eventId: string) => {
        await knex('notifications').del().where('event_id', eventId);
    };
};

const createNotificationRepository = (knex: Knex) => {
    return {
        deleteAllForEvent: deleteAllForEvent(knex),
        deleteById: deleteById(knex),
        get: get(knex),
        hasNotificationForEvent: hasNotificationForEvent(knex),
        insert: insert(knex),
    } as NotificationRepository;
};

export default createNotificationRepository;
