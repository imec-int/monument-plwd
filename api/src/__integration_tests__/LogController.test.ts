import { NotificationRepository } from '../repositories/NotificationRepository';
import { Knex } from 'knex';
import { subMinutes } from 'date-fns';
import { IUser } from 'src/models/User';
import { CalendarEventRepository } from 'src/repositories/CalendarEventRepository';
import { UserRepository } from 'src/repositories/UserRepository';
import { initTestSetup, MockAuthorizationHeaderTransform } from './IntegrationTestUtils';
import { StartedPostgisContainer } from './PostgisContainer';
import { CalendarEventBuilder, formatToCalendarAddress } from './seed-data/events';
import { caretakerUser, externalContactUser, externalContactUser2, plwdUser } from './seed-data/users';
import { LocationRepository } from '../repositories/LocationRepository';
import { INotifyForEventNotificationService } from '../services/NotificationService';
import { LogEvent } from '../models/Log';
import {
    eventCoordinates,
    userAt150mDistance,
    userJustOver150mDistance,
    userOutsideGeofenceCoordinate,
    userWithinGeofenceCoordinates,
} from './seed-data/locations';
import { ICoordinate, ILocation } from '../models/Locations';
import { INotification, INotificationType } from '../models/Notification';
import { MockCompositeNotificationService } from './MockNotificationService';
import { PlwdRepository } from '../repositories/PlwdRepository';
import { IPlwd } from '../models/Plwd';
import { ExternalContactsRepository } from '../repositories/ExternalContactsRepository';
import { mapToLocation } from '../controllers/LogController';
import { CarecircleMemberRepository } from 'src/repositories/CarecircleMemberRepository';
import { caretakerMembership } from './seed-data/carecircleMembership';
import { LocationHandlerService } from '../services/LocationHandlerService';

let container: StartedPostgisContainer;
let userRepository: UserRepository;
let jwt: MockAuthorizationHeaderTransform;
let calendarEventRepository: CalendarEventRepository;
let externalContactRepository: ExternalContactsRepository;
let locationRepository: LocationRepository;
let notificationRepository: NotificationRepository;
let carecircleMemberRepository: CarecircleMemberRepository;
let plwdRepository: PlwdRepository;
let database: Knex;
let locationHandlerService: LocationHandlerService;
let locationHandlerServiceWithOnlyConsoleNotifications: LocationHandlerService;
let notificationService: MockCompositeNotificationService;
let notificationServiceWithOnlyLogging: MockCompositeNotificationService;

let caretaker: IUser;
let plwd: IPlwd;

const coordinatesToLocationLogPayload = (coordinates: ICoordinate) =>
    JSON.stringify({
        latitude: coordinates.lat,
        longitude: coordinates.lng,
    });

beforeAll(async () => {
    ({
        container,
        database,
        repositories: {
            calendarEventRepository,
            carecircleMemberRepository,
            externalContactRepository,
            locationRepository,
            notificationRepository,
            plwdRepository,
            userRepository,
        },
        services: {
            locationHandlerService,
            locationHandlerServiceWithOnlyConsoleNotifications,
            notificationService,
            notificationServiceWithOnlyLogging,
        },
        mockJwtHandler: jwt,
    } = await initTestSetup());

    await jwt.loginAs(caretakerUser.auth0Id);
});

beforeEach(async () => {
    caretaker = await userRepository.insert(caretakerUser);
    plwd = await plwdRepository.insert({ ...plwdUser, caretakerId: caretaker.id });
    await carecircleMemberRepository.addMember({
        ...caretakerMembership,
        userId: caretaker.id,
        plwdId: plwd.id,
    });
});

afterEach(async () => {
    await carecircleMemberRepository.removeMemberByUserId(plwd.id, caretaker.id);
    await plwdRepository.deleteById(plwd.id);
    await userRepository.deleteById(caretaker.id);
});

afterAll(async () => {
    await database.destroy();
    await container.stop();
});

describe('LogController', () => {
    it('Should insert locations correctly into database', async () => {
        const locationLogs = [
            {
                id: '004169c5-6e0f-46e8-86ff-290d6f46e6b2',
                timestamp: '2022-04-04T07:49:24.639Z',
                payload: coordinatesToLocationLogPayload(userOutsideGeofenceCoordinate),
                user: plwd.watchId,
                type: LogEvent.LOCATION,
            },
        ];
        const locations = locationLogs.map(mapToLocation);

        await locationRepository.insert(locations);

        const storedLocations = await locationRepository.getByWatchId(plwd.watchId);

        expect(storedLocations).toHaveLength(1);
        const [storedLocation] = storedLocations;
        expect(storedLocation).toEqual({
            createdAt: storedLocation.createdAt,
            location: { lat: userOutsideGeofenceCoordinate.lat, lng: userOutsideGeofenceCoordinate.lng },
            id: storedLocation.id,
            timestamp: locationLogs[0].timestamp,
            watchId: plwd.watchId,
        } as ILocation);
        await locationRepository.deleteById(storedLocation.id);
    });

    it('Should return true when 2 points are within 150m distance between each other (+/- 145m distance)', async () => {
        const isWithinDistance = await locationRepository.isWithinDistance({
            coordinateA: eventCoordinates,
            coordinateB: userWithinGeofenceCoordinates,
            distance: 150,
        });

        expect(isWithinDistance).toEqual(true);
    });

    it('Should return true when 2 points are within 150m distance between each other (same location)', async () => {
        const isWithinDistance = await locationRepository.isWithinDistance({
            coordinateA: { lat: 0, lng: 0 },
            coordinateB: { lat: 0, lng: 0 },
            distance: 150,
        });

        expect(isWithinDistance).toEqual(true);
    });

    it('Should return false when 2 points are not within 150m distance between each other (+/- 160m distance)', async () => {
        const isWithinDistance = await locationRepository.isWithinDistance({
            coordinateA: eventCoordinates,
            coordinateB: userOutsideGeofenceCoordinate,
            distance: 150,
        });

        expect(isWithinDistance).toEqual(false);
    });

    it('Should return false when 2 points are not within 150m distance between each other (large distance)', async () => {
        const isWithinDistance = await locationRepository.isWithinDistance({
            coordinateA: { lat: 1, lng: 0 },
            coordinateB: { lat: 0, lng: 1 },
            distance: 150,
        });

        expect(isWithinDistance).toEqual(false);
    });

    it('Should return true when exactly at 150m distance between each other', async () => {
        const isWithinDistance = await locationRepository.isWithinDistance({
            coordinateA: eventCoordinates,
            coordinateB: userAt150mDistance,
            distance: 150,
        });

        expect(isWithinDistance).toEqual(true);
    });

    it('Should return false when just over 150m distance between each other', async () => {
        const isWithinDistance = await locationRepository.isWithinDistance({
            coordinateA: eventCoordinates,
            coordinateB: userJustOver150mDistance,
            distance: 150,
        });

        expect(isWithinDistance).toEqual(false);
    });

    it('Should not trigger a notification for an event that only started 5 minutes ago', async () => {
        const externalContact1 = await externalContactRepository.insert({ ...externalContactUser, plwdId: plwd.id });
        const externalContact2 = await externalContactRepository.insert({ ...externalContactUser2, plwdId: plwd.id });

        const calendarEvent = new CalendarEventBuilder()
            .withAddress(formatToCalendarAddress({ description: 'Somewhere in Bruges', location: eventCoordinates }))
            .withExternalContacts([externalContact1.id, externalContact2.id])
            .withPLWD(plwd.id)
            .withCreatedBy(caretaker.id)
            .build();

        const createdEvent = await calendarEventRepository.insert(calendarEvent);
        const ongoingDailyCalendarEvent = await calendarEventRepository.getById(createdEvent.id);

        const spyOngetOngoingEvents = jest.spyOn(calendarEventRepository, 'getOngoingEvents');
        const spyOnNotifyForEvent = jest.spyOn(notificationService, 'notifyForEvent');
        const spyOnIsWithinDistance = jest.spyOn(locationRepository, 'isWithinDistance');
        const spyOnHasNotificationForEvent = jest.spyOn(notificationRepository, 'hasNotificationForEvent');

        const locationLogs = [
            {
                id: '004169c5-6e0f-46e8-86ff-290d6f46e6b2',
                timestamp: '2022-04-04T07:49:24.639Z',
                payload: coordinatesToLocationLogPayload(userOutsideGeofenceCoordinate),
                user: plwd.watchId,
                type: LogEvent.LOCATION,
            },
        ];
        const locations = locationLogs.map(mapToLocation);
        await locationRepository.insert(locations);

        await locationHandlerService.sendNotifications();

        const [storedLocation] = await locationRepository.get();
        await locationRepository.deleteById(storedLocation.id);
        await calendarEventRepository.deleteById(ongoingDailyCalendarEvent.id);
        await externalContactRepository.remove(externalContact1.id);
        await externalContactRepository.remove(externalContact2.id);

        expect(spyOngetOngoingEvents).toBeCalledTimes(1);
        expect(spyOnIsWithinDistance).toBeCalledTimes(0);
        expect(spyOnNotifyForEvent).toBeCalledTimes(0);
        expect(spyOnHasNotificationForEvent).toBeCalledTimes(0);
    });

    it('Should not trigger a notification for an event that only started 15 minutes ago and when user is within range of 150m of event', async () => {
        const externalContact1 = await externalContactRepository.insert({ ...externalContactUser, plwdId: plwd.id });
        const externalContact2 = await externalContactRepository.insert({ ...externalContactUser2, plwdId: plwd.id });

        const calendarEvent = new CalendarEventBuilder()
            .withAddress(formatToCalendarAddress({ description: 'Somewhere in Bruges', location: eventCoordinates }))
            .withExternalContacts([externalContact1.id, externalContact2.id])
            .withPLWD(plwd.id)
            .withCreatedBy(caretaker.id)
            .withStartTime(subMinutes(new Date(), 15).toISOString())
            .build();
        const ongoingDailyCalendarEvent = await calendarEventRepository.insert(calendarEvent);

        const spyOngetOngoingEvents = jest.spyOn(calendarEventRepository, 'getOngoingEvents');
        const spyOnNotifyForEvent = jest.spyOn(notificationServiceWithOnlyLogging, 'notifyForEvent');
        const spyOnIsWithinDistance = jest.spyOn(locationRepository, 'isWithinDistance');
        const spyOnHasNotificationForEvent = jest.spyOn(notificationRepository, 'hasNotificationForEvent');

        const locationLogs = [
            {
                id: '004169c5-6e0f-46e8-86ff-290d6f46e6b2',
                timestamp: new Date().toISOString(),
                payload: coordinatesToLocationLogPayload(userWithinGeofenceCoordinates),
                user: plwd.watchId,
                type: LogEvent.LOCATION,
            },
        ];
        const locations = locationLogs.map(mapToLocation);
        await locationRepository.insert(locations);

        await locationHandlerService.sendNotifications();

        const [storedLocation] = await locationRepository.get();
        await locationRepository.deleteById(storedLocation.id);
        await calendarEventRepository.deleteById(ongoingDailyCalendarEvent.id);
        await externalContactRepository.remove(externalContact1.id);
        await externalContactRepository.remove(externalContact2.id);

        expect(spyOngetOngoingEvents).toBeCalledTimes(1);
        expect(spyOnIsWithinDistance).toBeCalledTimes(1);
        expect(spyOnNotifyForEvent).toBeCalledTimes(0);
        expect(spyOnHasNotificationForEvent).toBeCalledTimes(0);
    });

    it('Should not trigger a notification for an event that started 15 minutes ago has no address', async () => {
        const calendarEvent = new CalendarEventBuilder()
            .withAddress(undefined)
            .withExternalContacts([])
            .withPLWD(plwd.id)
            .withCreatedBy(caretaker.id)
            .withStartTime(subMinutes(new Date(), 15).toISOString())
            .build();

        const createdCalendarEvent = await calendarEventRepository.insert(calendarEvent);
        const ongoingDailyCalendarEvent = await calendarEventRepository.getById(createdCalendarEvent.id);

        const spyOngetOngoingEvents = jest.spyOn(calendarEventRepository, 'getOngoingEvents');
        const spyOnNotifyForEvent = jest.spyOn(notificationServiceWithOnlyLogging, 'notifyForEvent');
        const spyOnIsWithinDistance = jest.spyOn(locationRepository, 'isWithinDistance');

        const locationLogs = [
            {
                id: '004169c5-6e0f-46e8-86ff-290d6f46e6b2',
                timestamp: new Date().toISOString(),
                payload: coordinatesToLocationLogPayload(userOutsideGeofenceCoordinate),
                user: plwd.watchId,
                type: LogEvent.LOCATION,
            },
        ];
        const locations = locationLogs.map(mapToLocation);
        await locationRepository.insert(locations);

        await locationHandlerService.sendNotifications();

        const notifications = await notificationRepository.get();
        expect(notifications).toHaveLength(0);

        const [storedLocation] = await locationRepository.get();
        await locationRepository.deleteById(storedLocation.id);
        await calendarEventRepository.deleteById(ongoingDailyCalendarEvent.id);

        expect(spyOngetOngoingEvents).toBeCalledTimes(1);
        expect(spyOnIsWithinDistance).toBeCalledTimes(0);
        expect(spyOnNotifyForEvent).toBeCalledTimes(0);
    });

    it('Should trigger a notification for an event that started 15 minutes ago and user is not within range of 150 meters of event', async () => {
        const externalContact1 = await externalContactRepository.insert({ ...externalContactUser, plwdId: plwd.id });
        const externalContact2 = await externalContactRepository.insert({ ...externalContactUser2, plwdId: plwd.id });

        const calendarEvent = new CalendarEventBuilder()
            .withAddress(formatToCalendarAddress({ description: 'Somewhere in Bruges', location: eventCoordinates }))
            .withExternalContacts([externalContact1.id, externalContact2.id])
            .withPLWD(plwd.id)
            .withCreatedBy(caretaker.id)
            .withStartTime(subMinutes(new Date(), 15).toISOString())
            .build();

        const createdCalendarEvent = await calendarEventRepository.insert(calendarEvent);
        const ongoingDailyCalendarEvent = await calendarEventRepository.getById(createdCalendarEvent.id);

        const spyOngetOngoingEvents = jest.spyOn(calendarEventRepository, 'getOngoingEvents');
        const spyOnNotifyForEvent = jest.spyOn(notificationServiceWithOnlyLogging, 'notifyForEvent');
        const spyOnIsWithinDistance = jest.spyOn(locationRepository, 'isWithinDistance');
        const spyOnHasNotificationForEvent = jest.spyOn(notificationRepository, 'hasNotificationForEvent');

        const locationLogs = [
            {
                id: '004169c5-6e0f-46e8-86ff-290d6f46e6b2',
                timestamp: new Date().toISOString(),
                payload: coordinatesToLocationLogPayload(userOutsideGeofenceCoordinate),
                user: plwd.watchId,
                type: LogEvent.LOCATION,
            },
        ];
        const locations = locationLogs.map(mapToLocation);
        await locationRepository.insert(locations);

        await locationHandlerServiceWithOnlyConsoleNotifications.sendNotifications();

        const [notification1, notification2] = await notificationRepository.get();
        const recipients = await externalContactRepository.getByPlwdId(plwd.id);

        await notificationRepository.deleteAllForEvent(ongoingDailyCalendarEvent.id);
        const [storedLocation] = await locationRepository.get();
        await locationRepository.deleteById(storedLocation.id);
        await calendarEventRepository.deleteById(ongoingDailyCalendarEvent.id);
        await externalContactRepository.remove(externalContact1.id);
        await externalContactRepository.remove(externalContact2.id);

        expect(spyOngetOngoingEvents).toBeCalledTimes(1);
        expect(spyOnIsWithinDistance).toBeCalledTimes(1);
        expect(spyOnNotifyForEvent).toBeCalledTimes(1);
        expect(spyOnNotifyForEvent).toBeCalledWith({
            event: ongoingDailyCalendarEvent,
            location: locations[0].location,
            plwd,
            recipients,
        } as INotifyForEventNotificationService);
        expect(spyOnHasNotificationForEvent).toBeCalledTimes(2);

        expect(notification1).toEqual({
            contactUserId: externalContact1.id,
            createdAt: notification1.createdAt,
            eventId: ongoingDailyCalendarEvent.id,
            id: notification1.id,
            plwdId: plwd.id,
            type: INotificationType.CONSOLE,
        });
        expect(notification2).toEqual({
            contactUserId: externalContact2.id,
            createdAt: notification2.createdAt,
            eventId: ongoingDailyCalendarEvent.id,
            id: notification2.id,
            plwdId: plwd.id,
            type: INotificationType.CONSOLE,
        });
    });

    it('Should trigger a notification via email and console output for an event that started 15 minutes ago and user is not within range of 150 meters of event', async () => {
        const externalContact1 = await externalContactRepository.insert({ ...externalContactUser, plwdId: plwd.id });
        const externalContact2 = await externalContactRepository.insert({ ...externalContactUser2, plwdId: plwd.id });

        const calendarEvent = new CalendarEventBuilder()
            .withAddress(formatToCalendarAddress({ description: 'Somewhere in Bruges', location: eventCoordinates }))
            .withExternalContacts([externalContact1.id, externalContact2.id])
            .withPLWD(plwd.id)
            .withCreatedBy(caretaker.id)
            .withStartTime(subMinutes(new Date(), 15).toISOString())
            .build();

        const createdCalendarEvent = await calendarEventRepository.insert(calendarEvent);
        const ongoingDailyCalendarEvent = await calendarEventRepository.getById(createdCalendarEvent.id);

        const spyOngetOngoingEvents = jest.spyOn(calendarEventRepository, 'getOngoingEvents');
        const spyOnNotifyForEvent = jest.spyOn(notificationService, 'notifyForEvent');
        const spyOnIsWithinDistance = jest.spyOn(locationRepository, 'isWithinDistance');
        const spyOnHasNotificationForEvent = jest.spyOn(notificationRepository, 'hasNotificationForEvent');

        const locationLogs = [
            {
                id: '004169c5-6e0f-46e8-86ff-290d6f46e6b2',
                timestamp: new Date().toISOString(),
                payload: coordinatesToLocationLogPayload(userOutsideGeofenceCoordinate),
                user: plwd.watchId,
                type: LogEvent.LOCATION,
            },
        ];
        const locations = locationLogs.map(mapToLocation);
        await locationRepository.insert(locations);

        await locationHandlerService.sendNotifications();

        const notifications = await notificationRepository.get();
        expect(notifications).toHaveLength(4);

        const [notification1, notification2, notification3, notification4] = notifications;
        const recipients = await externalContactRepository.getByPlwdId(plwd.id);

        await notificationRepository.deleteAllForEvent(ongoingDailyCalendarEvent.id);
        const [storedLocation] = await locationRepository.get();
        await locationRepository.deleteById(storedLocation.id);
        await calendarEventRepository.deleteById(ongoingDailyCalendarEvent.id);
        await externalContactRepository.remove(externalContact1.id);
        await externalContactRepository.remove(externalContact2.id);

        expect(spyOngetOngoingEvents).toBeCalledTimes(1);
        expect(spyOnIsWithinDistance).toBeCalledTimes(1);
        expect(spyOnNotifyForEvent).toBeCalledTimes(1);
        expect(spyOnNotifyForEvent).toBeCalledWith({
            event: ongoingDailyCalendarEvent,
            location: locations[0].location,
            plwd,
            recipients,
        } as INotifyForEventNotificationService);
        expect(spyOnHasNotificationForEvent).toBeCalledTimes(4);

        expect(notification1).toEqual({
            contactUserId: externalContact1.id,
            createdAt: notification1.createdAt,
            eventId: ongoingDailyCalendarEvent.id,
            id: notification1.id,
            plwdId: plwd.id,
            type: INotificationType.EMAIL,
        } as INotification);
        expect(notification2).toEqual({
            contactUserId: externalContact2.id,
            createdAt: notification2.createdAt,
            eventId: ongoingDailyCalendarEvent.id,
            id: notification2.id,
            plwdId: plwd.id,
            type: INotificationType.EMAIL,
        } as INotification);
        expect(notification3).toEqual({
            contactUserId: externalContact1.id,
            createdAt: notification3.createdAt,
            eventId: ongoingDailyCalendarEvent.id,
            id: notification3.id,
            plwdId: plwd.id,
            type: INotificationType.CONSOLE,
        } as INotification);
        expect(notification4).toEqual({
            contactUserId: externalContact2.id,
            createdAt: notification4.createdAt,
            eventId: ongoingDailyCalendarEvent.id,
            id: notification4.id,
            plwdId: plwd.id,
            type: INotificationType.CONSOLE,
        } as INotification);
    });

    it('Should not send the notification twice to the same user for the same event', async () => {
        const externalContact1 = await externalContactRepository.insert({ ...externalContactUser, plwdId: plwd.id });
        const externalContact2 = await externalContactRepository.insert({ ...externalContactUser2, plwdId: plwd.id });

        const [caretakerMembership] = await carecircleMemberRepository.getMembers(plwd.id);

        const calendarEvent = new CalendarEventBuilder()
            .withAddress(formatToCalendarAddress({ description: 'Somewhere in Bruges', location: eventCoordinates }))
            .withExternalContacts([externalContact1.id, externalContact2.id])
            .withCarecircleContacts([caretakerMembership.id])
            .withPLWD(plwd.id)
            .withCreatedBy(caretaker.id)
            .withStartTime(subMinutes(new Date(), 15).toISOString())
            .build();

        const createdCalendarEvent = await calendarEventRepository.insert(calendarEvent);
        const ongoingDailyCalendarEvent = await calendarEventRepository.getById(createdCalendarEvent.id);

        const spyOngetOngoingEvents = jest.spyOn(calendarEventRepository, 'getOngoingEvents');
        const spyOnNotifyForEvent = jest.spyOn(notificationServiceWithOnlyLogging, 'notifyForEvent');
        const spyOnIsWithinDistance = jest.spyOn(locationRepository, 'isWithinDistance');
        const spyOnHasNotificationForEvent = jest.spyOn(notificationRepository, 'hasNotificationForEvent');
        const spyOnInsertNotificationForEvent = jest.spyOn(notificationRepository, 'insert');

        const locationLogs = [
            {
                id: '004169c5-6e0f-46e8-86ff-290d6f46e6b2',
                timestamp: new Date().toISOString(),
                payload: coordinatesToLocationLogPayload(userOutsideGeofenceCoordinate),
                user: plwd.watchId,
                type: LogEvent.LOCATION,
            },
        ];
        const locations = locationLogs.map(mapToLocation);
        await locationRepository.insert(locations);

        await locationHandlerServiceWithOnlyConsoleNotifications.sendNotifications();

        await locationHandlerServiceWithOnlyConsoleNotifications.sendNotifications();

        const notifications = await notificationRepository.get();
        expect(notifications).toHaveLength(3);
        const externalContactRecipients = await externalContactRepository.getByPlwdId(plwd.id);
        const carecircleRecipients = await carecircleMemberRepository.getMembers(plwd.id);

        const [notification1, notification2, notification3] = notifications;
        const [storedLocation] = await locationRepository.get();
        await locationRepository.deleteById(storedLocation.id);
        await notificationRepository.deleteAllForEvent(ongoingDailyCalendarEvent.id);
        await calendarEventRepository.deleteById(ongoingDailyCalendarEvent.id);
        await externalContactRepository.remove(externalContact1.id);
        await externalContactRepository.remove(externalContact2.id);

        expect(spyOngetOngoingEvents).toBeCalledTimes(2);
        expect(spyOnIsWithinDistance).toBeCalledTimes(2);
        expect(spyOnNotifyForEvent).toBeCalledTimes(2);
        expect(spyOnNotifyForEvent).toBeCalledWith({
            event: ongoingDailyCalendarEvent,
            location: locations[0].location,
            plwd,
            recipients: [...externalContactRecipients, ...carecircleRecipients],
        } as INotifyForEventNotificationService);
        expect(spyOnHasNotificationForEvent).toBeCalledTimes(6);
        expect(spyOnInsertNotificationForEvent).toBeCalledTimes(3);

        expect(notification1).toEqual({
            contactUserId: externalContact1.id,
            createdAt: notification1.createdAt,
            eventId: ongoingDailyCalendarEvent.id,
            id: notification1.id,
            plwdId: plwd.id,
            type: INotificationType.CONSOLE,
        } as INotification);
        expect(notification2).toEqual({
            contactUserId: externalContact2.id,
            createdAt: notification2.createdAt,
            eventId: ongoingDailyCalendarEvent.id,
            id: notification2.id,
            plwdId: plwd.id,
            type: INotificationType.CONSOLE,
        } as INotification);
        expect(notification3).toEqual({
            contactUserId: caretaker.id,
            createdAt: notification3.createdAt,
            eventId: ongoingDailyCalendarEvent.id,
            id: notification3.id,
            plwdId: plwd.id,
            type: INotificationType.CONSOLE,
        } as INotification);
    });

    it('Should trigger a notification when last known location was emitted up to 60 minutes before event starttime', async () => {
        const now = new Date();
        // 60 minutes + 15 minutes - 1 minute to make it within range
        const seventyFourMinutesAgo = subMinutes(now, 74).toISOString();

        const calendarEvent = new CalendarEventBuilder()
            .withAddress(formatToCalendarAddress({ description: 'Somewhere in Bruges', location: eventCoordinates }))
            .withExternalContacts([])
            .withCarecircleContacts([caretakerMembership.id])
            .withPLWD(plwd.id)
            .withCreatedBy(caretaker.id)
            .withStartTime(subMinutes(now, 15).toISOString())
            .build();
        const createdCalendarEvent = await calendarEventRepository.insert(calendarEvent);

        const spyOnNotifyForEvent = jest.spyOn(notificationService, 'notifyForEvent');
        const spyOnIsWithinDistance = jest.spyOn(locationRepository, 'isWithinDistance');
        const spyOngetOngoingEvents = jest.spyOn(calendarEventRepository, 'getOngoingEvents');

        const locationLogs = [
            {
                id: '004169c5-6e0f-46e8-86ff-290d6f46e6b2',
                timestamp: seventyFourMinutesAgo,
                payload: coordinatesToLocationLogPayload(userOutsideGeofenceCoordinate),
                user: plwd.watchId,
                type: LogEvent.LOCATION,
            },
        ];
        const locations = locationLogs.map(mapToLocation);
        await locationRepository.insert(locations);

        await locationHandlerService.sendNotifications();

        expect(spyOngetOngoingEvents).toBeCalledTimes(1);
        expect(spyOnIsWithinDistance).toBeCalledTimes(1);
        expect(spyOnNotifyForEvent).toBeCalledTimes(1);

        const notifications = await notificationRepository.get();
        expect(notifications).toHaveLength(2);
        const [notification1, notification2] = notifications;
        await notificationRepository.deleteById(notification1.id);
        await notificationRepository.deleteById(notification2.id);

        const [storedLocation] = await locationRepository.get();
        await locationRepository.deleteById(storedLocation.id);
        await calendarEventRepository.deleteById(createdCalendarEvent.id);
    });

    it('Should not trigger a notification when last known location was emitted more than 60 minutes before event starttime', async () => {
        const now = new Date();
        // 60 minutes + 15 minutes + 1 minute to make it out of range
        const seventySixMinutesAgo = subMinutes(now, 76).toISOString();

        const calendarEvent = new CalendarEventBuilder()
            .withAddress(formatToCalendarAddress({ description: 'Somewhere in Bruges', location: eventCoordinates }))
            .withExternalContacts([])
            .withCarecircleContacts([caretakerMembership.id])
            .withPLWD(plwd.id)
            .withCreatedBy(caretaker.id)
            .withStartTime(subMinutes(now, 15).toISOString())
            .build();
        const createdCalendarEvent = await calendarEventRepository.insert(calendarEvent);

        const spyOnNotifyForEvent = jest.spyOn(notificationServiceWithOnlyLogging, 'notifyForEvent');
        const spyOnIsWithinDistance = jest.spyOn(locationRepository, 'isWithinDistance');
        const spyOngetOngoingEvents = jest.spyOn(calendarEventRepository, 'getOngoingEvents');

        const locationLogs = [
            {
                id: '004169c5-6e0f-46e8-86ff-290d6f46e6b2',
                timestamp: seventySixMinutesAgo,
                payload: coordinatesToLocationLogPayload(userOutsideGeofenceCoordinate),
                user: plwd.watchId,
                type: LogEvent.LOCATION,
            },
        ];
        const locations = locationLogs.map(mapToLocation);
        await locationRepository.insert(locations);

        await locationHandlerService.sendNotifications();

        expect(spyOngetOngoingEvents).toBeCalledTimes(1);
        expect(spyOnIsWithinDistance).toBeCalledTimes(0);
        expect(spyOnNotifyForEvent).toBeCalledTimes(0);

        const [storedLocation] = await locationRepository.get();
        await locationRepository.deleteById(storedLocation.id);
        await calendarEventRepository.deleteById(createdCalendarEvent.id);
    });
});
