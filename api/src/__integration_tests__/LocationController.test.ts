import { Knex } from 'knex';
import { IUser } from 'src/models/User';
import { UserRepository } from 'src/repositories/UserRepository';
import { initTestSetup, MockAuthorizationHeaderTransform } from './IntegrationTestUtils';
import { StartedPostgisContainer } from './PostgisContainer';
import { adminUser, caretakerUser, externalContactUser, plwdUser, carecircleMemberUser } from './seed-data/users';
import { LocationRepository } from '../repositories/LocationRepository';
import { LogEvent } from '../models/Log';
import { userOutsideGeofenceCoordinate, userWithinGeofenceCoordinates } from './seed-data/locations';
import { ICoordinate } from '../models/Locations';
import { PlwdRepository } from '../repositories/PlwdRepository';
import { IPlwd } from '../models/Plwd';
import { ExternalContactsRepository } from '../repositories/ExternalContactsRepository';
import { IExternalContact } from '../models/ExternalContact';
import { mapToLocation } from '../controllers/LogController';
import request from 'supertest';
import Koa from 'koa';
import { CalendarEventBuilder } from './seed-data/events';
import { CalendarEventRepository } from '../repositories/CalendarEventRepository';
import { CarecircleMemberRepository } from '../repositories/CarecircleMemberRepository';
import { addMinutes, subMinutes } from 'date-fns';
import { membershipWithReadOnlyPermissions } from './seed-data/carecircleMembership';

let container: StartedPostgisContainer;
let userRepository: UserRepository;
let jwt: MockAuthorizationHeaderTransform;
let externalContactRepository: ExternalContactsRepository;
let locationRepository: LocationRepository;
let plwdRepository: PlwdRepository;
let calendarEventRepository: CalendarEventRepository;
let database: Knex;
let app: Koa;

let caretaker: IUser;
let plwd: IPlwd;
let contactPerson: IExternalContact;
let admin: IUser;
let carecircleMember: IUser;
let carecircleMemberRepository: CarecircleMemberRepository;

const coordinatesToLocationLogPayload = (coordinates: ICoordinate) =>
    JSON.stringify({
        latitude: coordinates.lat,
        longitude: coordinates.lng,
    });

beforeAll(async () => {
    ({
        app,
        container,
        database,
        repositories: {
            calendarEventRepository,
            carecircleMemberRepository,
            externalContactRepository,
            locationRepository,
            plwdRepository,
            userRepository,
        },
        mockJwtHandler: jwt,
    } = await initTestSetup());
});

beforeEach(async () => {
    admin = await userRepository.insert(adminUser);
    caretaker = await userRepository.insert(caretakerUser);
    carecircleMember = await userRepository.insert(carecircleMemberUser);
    plwd = await plwdRepository.insert({ ...plwdUser, caretakerId: caretaker.id });
    contactPerson = await externalContactRepository.insert({ ...externalContactUser, plwdId: plwd.id });
});

afterEach(async () => {
    await externalContactRepository.remove(contactPerson.id);
    await userRepository.deleteById(carecircleMember.id);
    await plwdRepository.deleteById(plwd.id);
    await userRepository.deleteById(caretaker.id);
});

afterAll(async () => {
    await database.destroy();
    await container.stop();
});

describe('LocationController', () => {
    it('Should allow to fetch locations as a caretaker', async () => {
        await jwt.loginAs(caretaker.auth0Id);

        const log = {
            id: '004169c5-6e0f-46e8-86ff-290d6f46e6b2',
            timestamp: '2022-04-04T07:49:24.639Z',
            payload: coordinatesToLocationLogPayload(userOutsideGeofenceCoordinate),
            user: plwd.watchId,
            type: LogEvent.LOCATION,
        };
        const locationLogs = [log];
        const locations = locationLogs.map(mapToLocation);
        await locationRepository.insert(locations);

        const response = await request(app.callback()).get(`/locations/${plwd.id}`);
        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        expect(response.body.data).toHaveLength(1);
        const [location] = response.body.data;
        expect(location.location).toEqual(userOutsideGeofenceCoordinate);
        expect(location.timestamp).toEqual(log.timestamp);
        expect(location.watchId).toEqual(log.user);

        await locationRepository.deleteById(location.id);
    });

    it('Should allow to fetch locations as an admin', async () => {
        await jwt.loginAs(admin.auth0Id);

        const log = {
            id: '004169c5-6e0f-46e8-86ff-290d6f46e6b2',
            timestamp: '2022-04-04T07:49:24.639Z',
            payload: coordinatesToLocationLogPayload(userOutsideGeofenceCoordinate),
            user: plwd.watchId,
            type: LogEvent.LOCATION,
        };
        const locationLogs = [log];
        const locations = locationLogs.map(mapToLocation);
        await locationRepository.insert(locations);

        const response = await request(app.callback()).get(`/locations/${plwd.id}`);
        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        expect(response.body.data).toHaveLength(1);
        const [location] = response.body.data;
        expect(location.location).toEqual(userOutsideGeofenceCoordinate);
        expect(location.timestamp).toEqual(log.timestamp);
        expect(location.watchId).toEqual(log.user);

        await locationRepository.deleteById(location.id);
    });

    it('Should allow to fetch public locations', async () => {
        const calendarEvent = new CalendarEventBuilder().withPLWD(plwd.id).withCreatedBy(caretaker.id).build();
        const createdEvent = await calendarEventRepository.insert(calendarEvent);

        const log = {
            id: '004169c5-6e0f-46e8-86ff-290d6f46e6b2',
            timestamp: '2022-04-04T07:49:24.639Z',
            payload: coordinatesToLocationLogPayload(userOutsideGeofenceCoordinate),
            user: plwd.watchId,
            type: LogEvent.LOCATION,
        };
        const locationLogs = [log];
        const locations = locationLogs.map(mapToLocation);
        await locationRepository.insert(locations);

        const response = await request(app.callback()).get(`/public-location/${createdEvent.id}`);
        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        const [location] = response.body.data;
        expect(location.location).toEqual(userOutsideGeofenceCoordinate);
        expect(location.timestamp).toEqual(log.timestamp);
        expect(location.watchId).toEqual(log.user);

        await locationRepository.deleteById(location.id);
        await calendarEventRepository.deleteById(createdEvent.id);
    });

    it('Should always fetch the latest available public location', async () => {
        const calendarEvent = new CalendarEventBuilder().withPLWD(plwd.id).withCreatedBy(caretaker.id).build();
        const createdEvent = await calendarEventRepository.insert(calendarEvent);

        const firstLog = {
            id: '004169c5-6e0f-46e8-86ff-290d6f46e6b2',
            timestamp: '2022-04-04T07:49:24.639Z',
            payload: coordinatesToLocationLogPayload(userOutsideGeofenceCoordinate),
            user: plwd.watchId,
            type: LogEvent.LOCATION,
        };
        const secondLog = {
            id: '004169c5-6e0f-46e8-86ff-290d6f46e6b2',
            timestamp: '2022-04-04T07:50:00.000Z',
            payload: coordinatesToLocationLogPayload(userWithinGeofenceCoordinates),
            user: plwd.watchId,
            type: LogEvent.LOCATION,
        };
        const locationLogs = [firstLog, secondLog];
        const locations = locationLogs.map(mapToLocation);
        await locationRepository.insert(locations);

        const response = await request(app.callback()).get(`/public-location/${createdEvent.id}`);
        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        const [location] = response.body.data;
        expect(location.location).toEqual(userWithinGeofenceCoordinates);
        expect(location.timestamp).toEqual(secondLog.timestamp);
        expect(location.watchId).toEqual(secondLog.user);

        const [one, two] = await locationRepository.get();

        await locationRepository.deleteById(one.id);
        await locationRepository.deleteById(two.id);
        await calendarEventRepository.deleteById(createdEvent.id);
    });

    it('Should fetch public locations and return results for every 10 minutes during a specific event', async () => {
        const now = new Date();
        // create end time from now + 2 hours
        const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
        const calendarEvent = new CalendarEventBuilder()
            .withStartTime(now.toISOString())
            .withEndTime(endTime)
            .withPLWD(plwd.id)
            .withCreatedBy(caretaker.id)
            .build();
        const createdEvent = await calendarEventRepository.insert(calendarEvent);

        const firstLog = {
            id: '004169c5-6e0f-46e8-86ff-290d6f46e6b2',
            // timestamp should be now - 35 minutes
            timestamp: new Date(now.getTime() - 35 * 60 * 1000).toISOString(),
            payload: coordinatesToLocationLogPayload(userOutsideGeofenceCoordinate),
            user: plwd.watchId,
            type: LogEvent.LOCATION,
        };
        const secondLog = {
            id: '004169c5-6e0f-46e8-86ff-290d6f46e6b2',
            // timestamp should be now - 25 minutes
            timestamp: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
            payload: coordinatesToLocationLogPayload(userWithinGeofenceCoordinates),
            user: plwd.watchId,
            type: LogEvent.LOCATION,
        };
        const thirdLog = {
            id: '004169c5-6e0f-46e8-86ff-290d6f46e6b2',
            // timestamp should be now - 25 minutes
            timestamp: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
            payload: coordinatesToLocationLogPayload(userOutsideGeofenceCoordinate),
            user: plwd.watchId,
            type: LogEvent.LOCATION,
        };
        const fourthLog = {
            id: '004169c5-6e0f-46e8-86ff-290d6f46e6b2',
            // timestamp should be now + 1 hour
            timestamp: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
            payload: coordinatesToLocationLogPayload(userWithinGeofenceCoordinates),
            user: plwd.watchId,
            type: LogEvent.LOCATION,
        };
        const fifthLog = {
            id: '004169c5-6e0f-46e8-86ff-290d6f46e6b2',
            // timestamp should be now + 1 hour and 20 minutes
            timestamp: new Date(now.getTime() + 80 * 60 * 1000).toISOString(),
            payload: coordinatesToLocationLogPayload(userOutsideGeofenceCoordinate),
            user: plwd.watchId,
            type: LogEvent.LOCATION,
        };
        // create a date now + 2 hours
        const sixthLog = {
            id: '004169c5-6e0f-46e8-86ff-290d6f46e6b2',
            // timestamp should be now + 2 hours and 35 minutes
            timestamp: new Date(now.getTime() + 155 * 60 * 1000).toISOString(),
            payload: coordinatesToLocationLogPayload(userOutsideGeofenceCoordinate),
            user: plwd.watchId,
            type: LogEvent.LOCATION,
        };
        const locationLogs = [firstLog, secondLog, thirdLog, fourthLog, fifthLog, sixthLog];
        const locations = locationLogs.map(mapToLocation);
        await locationRepository.insert(locations);

        const response = await request(app.callback()).get(`/public-location/${createdEvent.id}`);
        expect(response.body.data).toHaveLength(3);

        const [one, two, three, four, five, six] = await locationRepository.get();
        await locationRepository.deleteById(one.id);
        await locationRepository.deleteById(two.id);
        await locationRepository.deleteById(three.id);
        await locationRepository.deleteById(four.id);
        await locationRepository.deleteById(five.id);
        await locationRepository.deleteById(six.id);
        await calendarEventRepository.deleteById(createdEvent.id);
    });

    it('Should not allow to fetch locations from an event that has not yet started', async () => {
        const startTime = addMinutes(new Date(), 10).toISOString();
        const endTime = addMinutes(new Date(), 30).toISOString();

        const calendarEvent = new CalendarEventBuilder()
            .withStartTime(startTime)
            .withEndTime(endTime)
            .withPLWD(plwd.id)
            .withCreatedBy(caretaker.id)
            .build();
        const createdEvent = await calendarEventRepository.insert(calendarEvent);

        const response = await request(app.callback()).get(`/public-location/${createdEvent.id}`);
        expect(response.status).toEqual(403);
        expect(response.text).toEqual(`Event ${createdEvent.id} is not active`);

        await calendarEventRepository.deleteById(createdEvent.id);
    });

    it('Should not allow to fetch locations from an event that has finished', async () => {
        const startTime = subMinutes(new Date(), 300).toISOString();
        const endTime = subMinutes(new Date(), 241).toISOString();

        const calendarEvent = new CalendarEventBuilder()
            .withStartTime(startTime)
            .withEndTime(endTime)
            .withPLWD(plwd.id)
            .withCreatedBy(caretaker.id)
            .build();
        const createdEvent = await calendarEventRepository.insert(calendarEvent);

        const response = await request(app.callback()).get(`/public-location/${createdEvent.id}`);
        expect(response.status).toEqual(403);
        expect(response.text).toEqual(`Event ${createdEvent.id} is not active`);

        await calendarEventRepository.deleteById(createdEvent.id);
    });

    it('Should allow to fetch locations if there is an ongoing event for a permission when-assigned', async () => {
        await jwt.loginAs(carecircleMember.auth0Id);

        const startTime = subMinutes(new Date(), 40).toISOString();
        const endTime = addMinutes(new Date(), 40).toISOString();

        const membership = {
            ...membershipWithReadOnlyPermissions,
            plwdId: plwd.id,
            userId: carecircleMember.id,
        };
        await carecircleMemberRepository.addMember(membership);

        const calendarEvent = new CalendarEventBuilder()
            .withStartTime(startTime)
            .withEndTime(endTime)
            .withPLWD(plwd.id)
            .withCreatedBy(carecircleMember.id)
            .build();
        const createdEvent = await calendarEventRepository.insert(calendarEvent);

        const log = {
            id: '004169c5-6e0f-46e8-86ff-290d6f46e6b2',
            timestamp: new Date().toISOString(),
            payload: coordinatesToLocationLogPayload(userOutsideGeofenceCoordinate),
            user: plwd.watchId,
            type: LogEvent.LOCATION,
        };
        const locationLogs = [log];
        const locations = locationLogs.map(mapToLocation);
        await locationRepository.insert(locations);

        const response = await request(app.callback()).get(`/locations/${createdEvent.plwdId}`);
        expect(response.status).toEqual(200);
        expect(response.body.data).toHaveLength(1);

        await calendarEventRepository.deleteById(createdEvent.id);
        await carecircleMemberRepository.removeMemberByUserId(membership.plwdId, carecircleMember.id);
    });

    it('Should not allow to fetch locations if there is no ongoing event for a permission when-assigned', async () => {
        await jwt.loginAs(carecircleMember.auth0Id);

        const startTime = subMinutes(new Date(), 41).toISOString();
        const endTime = subMinutes(new Date(), 21).toISOString();

        const membership = {
            ...membershipWithReadOnlyPermissions,
            plwdId: plwd.id,
            userId: carecircleMember.id,
        };
        await carecircleMemberRepository.addMember(membership);

        const calendarEvent = new CalendarEventBuilder()
            .withStartTime(startTime)
            .withEndTime(endTime)
            .withPLWD(plwd.id)
            .withCreatedBy(caretaker.id)
            .build();
        const createdEvent = await calendarEventRepository.insert(calendarEvent);

        const log = {
            id: '004169c5-6e0f-46e8-86ff-290d6f46e6b2',
            timestamp: new Date().toISOString(),
            payload: coordinatesToLocationLogPayload(userOutsideGeofenceCoordinate),
            user: plwd.watchId,
            type: LogEvent.LOCATION,
        };
        const locationLogs = [log];
        const locations = locationLogs.map(mapToLocation);
        await locationRepository.insert(locations);

        const response = await request(app.callback()).get(`/locations/${createdEvent.plwdId}`);
        expect(response.status).toEqual(403);
        expect(response.text).toEqual('Forbidden');

        await calendarEventRepository.deleteById(createdEvent.id);
        await carecircleMemberRepository.removeMemberByUserId(membership.plwdId, carecircleMember.id);
    });
});
