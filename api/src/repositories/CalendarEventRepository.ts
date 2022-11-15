import { Knex } from 'knex';
import logger from '../utils/logger';
import { CalendarEvent, CalendarEventWithContacts } from '../models/CalendarEvent';
import { randomUUID } from 'crypto';
import { mapToExternalContactViewModel } from './ExternalContactsRepository';
import { mapToCarecircleViewModel } from './CarecircleMemberRepository';

export interface CalendarEventRepository {
    deleteById(id: string): Promise<void>;
    get(): Promise<CalendarEventWithContacts[]>;
    getById(id: string): Promise<CalendarEventWithContacts>;
    getByPlwdId(plwdId: string): Promise<CalendarEventWithContacts[]>;
    getOngoingEvents(): Promise<CalendarEventWithContacts[]>;
    getOngoingEventsByPlwdId(plwdId: string): Promise<CalendarEventWithContacts[]>;
    insert(calendarEvent: CalendarEvent): Promise<CalendarEvent>;
    update(calendarEvent: CalendarEvent): Promise<CalendarEvent>;
}

const table = 'calendar_events';

const mapToCalendarEventWithContacts = (data: any): CalendarEventWithContacts => ({
    address: JSON.parse(data.address),
    carecircleMembers: [],
    createdBy: data.created_by,
    date: data.date,
    endTime: data.end_time,
    externalContacts: [],
    id: data.id,
    pickedUp: data.picked_up,
    repeat: data.repeat,
    startTime: data.start_time,
    title: data.title,
    plwdId: data.plwd_user_id,
});

const insert = (knex: Knex) => {
    return async (calendarEvent: CalendarEvent) => {
        try {
            return knex.transaction(async (trx) => {
                const now = new Date();
                const id = randomUUID();
                const newCalendarEvent = {
                    id,
                    address: calendarEvent.address,
                    end_time: calendarEvent.endTime,
                    date: calendarEvent.date,
                    picked_up: calendarEvent.pickedUp,
                    repeat: calendarEvent.repeat,
                    start_time: calendarEvent.startTime,
                    title: calendarEvent.title,
                    updated_at: now,
                    created_at: now,
                    plwd_user_id: calendarEvent.plwdId,
                    created_by: calendarEvent.createdBy,
                };

                // Add calendar event data
                await trx(table).insert(newCalendarEvent);

                // Add carecircle members link
                const carecircleMemberLinks = calendarEvent.carecircleMemberIds.map((cId) => ({
                    calendar_event_id: id,
                    carecircle_member_id: cId,
                }));
                if (carecircleMemberLinks.length > 0) {
                    await trx('calendar_events_carecircle_members').insert(carecircleMemberLinks);
                }

                // Add external contacts link
                const externalContactLinks = calendarEvent.externalContactIds.map((cId) => ({
                    calendar_event_id: id,
                    external_contact_id: cId,
                }));
                if (externalContactLinks.length > 0) {
                    await trx('calendar_events_external_contacts').insert(externalContactLinks);
                }

                return {
                    ...calendarEvent,
                    id,
                };
            });
        } catch (error) {
            logger.error('Inserting calendar event', error);
            throw error;
        }
    };
};

const update = (knex: Knex) => {
    return async (calendarEvent: CalendarEvent) => {
        try {
            const now = new Date();
            return knex.transaction(async (trx) => {
                await trx(table)
                    .update({
                        address: calendarEvent.address,
                        date: calendarEvent.date,
                        end_time: calendarEvent.endTime,
                        picked_up: calendarEvent.pickedUp,
                        repeat: calendarEvent.repeat,
                        start_time: calendarEvent.startTime,
                        title: calendarEvent.title,
                        updated_at: now,
                    })
                    .where('id', calendarEvent.id);

                // Remove all carecircle members for calendar event id
                await trx('calendar_events_carecircle_members').where('calendar_event_id', calendarEvent.id).del();

                // Remove all external contacts for calendar event id
                await trx('calendar_events_external_contacts').where('calendar_event_id', calendarEvent.id).del();

                // Add carecircle members link
                const carecircleMemberLinks = calendarEvent.carecircleMemberIds.map((cId) => ({
                    calendar_event_id: calendarEvent.id,
                    carecircle_member_id: cId,
                }));
                if (carecircleMemberLinks.length > 0) {
                    await trx('calendar_events_carecircle_members').insert(carecircleMemberLinks);
                }

                // Add external contacts link
                const externalContactLinks = calendarEvent.externalContactIds.map((cId) => ({
                    calendar_event_id: calendarEvent.id,
                    external_contact_id: cId,
                }));
                if (externalContactLinks.length > 0) {
                    await trx('calendar_events_external_contacts').insert(externalContactLinks);
                }
                return calendarEvent;
            });
        } catch (error) {
            logger.error('Saving calendar event', error);
            throw error;
        }
    };
};

const getById = (knex: Knex) => {
    return async (id: string) => {
        const message = 'Fetching calendar events';
        const profiler = logger.startTimer();
        const result = await knex(table).first('*').where({ id });
        profiler.done({ message });
        if (!result) return result;
        const calendarEvent = mapToCalendarEventWithContacts(result);
        return addContactsToCalendarEvent(knex, calendarEvent);
    };
};

const getByPlwdId = (knex: Knex) => {
    return async (plwdId: string) => {
        const message = 'Fetching calendar events';
        const profiler = logger.startTimer();
        const results = await knex(table).select('*').where('plwd_user_id', plwdId);
        profiler.done({ message });
        const calendarEvents = results.map(mapToCalendarEventWithContacts);
        return Promise.all(calendarEvents.map((event) => addContactsToCalendarEvent(knex, event)));
    };
};

const addContactsToCalendarEvent = async (knex: Knex, event: CalendarEventWithContacts) => {
    const carecircleMembers = await knex('calendar_events_carecircle_members')
        .select(
            'users.first_name AS firstName',
            'users.last_name AS lastName',
            'users.phone',
            'users.email',
            'users.id AS userId',
            'users.role',
            'users.picture',
            'carecircle_members.id',
            'carecircle_members.affiliation',
            'carecircle_members.permissions',
            'carecircle_members.plwd_user_id AS plwdId'
        )
        .join('carecircle_members', 'carecircle_members.id', 'calendar_events_carecircle_members.carecircle_member_id')
        .join('users', 'users.id', 'carecircle_members.user_id')
        .where('calendar_events_carecircle_members.calendar_event_id', event.id)
        .andWhere('carecircle_members.plwd_user_id', event.plwdId);
    event.carecircleMembers = carecircleMembers.map(mapToCarecircleViewModel);

    const externalContacts = await knex('calendar_events_external_contacts')
        .select('id', 'first_name', 'last_name', 'phone', 'email', 'affiliation', 'plwd_user_id')
        .join('external_contacts', 'calendar_events_external_contacts.external_contact_id', 'external_contacts.id')
        .where('calendar_events_external_contacts.calendar_event_id', event.id)
        .andWhere('external_contacts.plwd_user_id', event.plwdId);
    event.externalContacts = externalContacts.map(mapToExternalContactViewModel);

    return event;
};

const get = (knex: Knex) => {
    return async () => {
        const message = `Fetching calendar events`;
        const profiler = logger.startTimer();
        const result = await knex(table).select('*');
        const mappedEvents = result.map(mapToCalendarEventWithContacts);
        profiler.done({ message });
        return Promise.all(mappedEvents.map((event) => addContactsToCalendarEvent(knex, event)));
    };
};

const deleteById = (knex: Knex) => {
    return async (id: string) => {
        return knex.transaction(async (trx) => {
            const message = `Delete calendar event`;
            const profiler = logger.startTimer();

            // Cleanup external contacts
            await trx('calendar_events_external_contacts').del().where('calendar_event_id', id);

            // Cleanup carecircle member contacts
            await trx('calendar_events_carecircle_members').del().where('calendar_event_id', id);

            // Finally, cleanup the calendar event itself
            await trx(table).where({ id: id }).del();
            profiler.done({ message });
        });
    };
};

const getOngoingEvents = (knex: Knex) => {
    return async () => {
        const message = 'Fetching ongoing calendar events';
        const profiler = logger.startTimer();
        const now = new Date();
        const result = await knex(table)
            .select('*')
            .andWhereNot('address', null)
            .where('start_time', '<=', now)
            .andWhere('end_time', '>=', now);
        const mappedEvents = result.map(mapToCalendarEventWithContacts);
        profiler.done({ message });
        return Promise.all(mappedEvents.map((event) => addContactsToCalendarEvent(knex, event)));
    };
};

const getOngoingEventsByPlwdId = (knex: Knex) => {
    return async (plwdId: string) => {
        const message = `Fetching ongoing calendar events for user [${plwdId}]`;
        const profiler = logger.startTimer();
        const now = new Date();
        const result = await knex(table)
            .select('*')
            .where('plwd_user_id', plwdId)
            .andWhereNot('address', null)
            .where('start_time', '<=', now)
            .andWhere('end_time', '>=', now);
        const mappedEvents = result.map(mapToCalendarEventWithContacts);
        profiler.done({ message });
        return Promise.all(mappedEvents.map((event) => addContactsToCalendarEvent(knex, event)));
    };
};

const createCalendarEventRepository = (knex: Knex) => {
    return {
        deleteById: deleteById(knex),
        get: get(knex),
        getById: getById(knex),
        getByPlwdId: getByPlwdId(knex),
        getOngoingEvents: getOngoingEvents(knex),
        getOngoingEventsByPlwdId: getOngoingEventsByPlwdId(knex),
        insert: insert(knex),
        update: update(knex),
    } as CalendarEventRepository;
};

export default createCalendarEventRepository;
