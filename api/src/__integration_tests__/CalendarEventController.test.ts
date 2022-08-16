import { Knex } from 'knex';
import Koa from 'koa';
import { CalendarEvent, CalendarEventWithContacts } from 'src/models/CalendarEvent';
import { IPlwd } from 'src/models/Plwd';
import { IUser } from 'src/models/User';
import { CalendarEventRepository } from 'src/repositories/CalendarEventRepository';
import { CarecircleMemberRepository } from 'src/repositories/CarecircleMemberRepository';
import { ExternalContactsRepository } from 'src/repositories/ExternalContactsRepository';
import { PlwdRepository } from 'src/repositories/PlwdRepository';
import { UserRepository } from 'src/repositories/UserRepository';
import request from 'supertest';
import { initTestSetup, MockAuthorizationHeaderTransform } from './IntegrationTestUtils';
import { StartedPostgisContainer } from './PostgisContainer';
import {
    membershipWithManagePermissions,
    membershipWithNoPermissions,
    membershipWithReadOnlyPermissions,
} from './seed-data/carecircleMembership';
import { adminUser, carecircleMemberUser, caretakerUser, externalContactUser, plwdUser } from './seed-data/users';

let app: Koa;
let container: StartedPostgisContainer;
let carecircleMemberRepository: CarecircleMemberRepository;
let calendarEventRepository: CalendarEventRepository;
let externalContactRepository: ExternalContactsRepository;
let userRepository: UserRepository;
let plwdRepository: PlwdRepository;
let jwt: MockAuthorizationHeaderTransform;
let caretaker: IUser;
let admin: IUser;
let carecircleMember: IUser;
let plwd: IPlwd;
let database: Knex;

beforeAll(async () => {
    ({
        app,
        container,
        database,
        repositories: {
            calendarEventRepository,
            carecircleMemberRepository,
            externalContactRepository,
            plwdRepository,
            userRepository,
        },
        mockJwtHandler: jwt,
    } = await initTestSetup());
});

beforeEach(async () => {
    carecircleMember = await userRepository.insert(carecircleMemberUser);
    admin = await userRepository.insert(adminUser);
    caretaker = await userRepository.insert(caretakerUser);
    plwd = await plwdRepository.insert({ ...plwdUser, caretakerId: caretaker.id });
});

afterEach(async () => {
    await userRepository.deleteById(carecircleMember.id);
    await userRepository.deleteById(admin.id);
    await userRepository.deleteById(caretaker.id);
    await plwdRepository.deleteById(plwd.id);
});

afterAll(async () => {
    await database.destroy();
    await container.stop();
});

describe('CalendarEventController', () => {
    it('Should allow a caretaker to add a calendar event', async () => {
        await jwt.loginAs(caretaker.auth0Id);

        const data = {
            address: {
                description: 'Bruges, Belgium',
                geometry: { location: { lat: 51.2091807, lng: 3.2247552 } },
            },
            carecircleMemberIds: [],
            createdBy: caretaker.id,
            endTime: '2022-05-25 10:30:00+02',
            externalContactIds: [],
            id: '',
            pickedUp: true,
            plwdId: plwd.id,
            repeat: 'Never',
            startTime: '2022-05-25 10:00:00+02',
            title: 'Calendar Event',
        } as CalendarEvent;

        const response = await request(app.callback()).post(`/calendar-event/${plwd.id}`).send(data);

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        const getResponse = await request(app.callback()).get(`/calendar-events/${plwd.id}`);
        expect(getResponse.status).toEqual(200);
        expect(getResponse.body.success).toEqual(true);
        expect(getResponse.body.data).toHaveLength(1);

        const [calendarEvent] = getResponse.body.data;

        await calendarEventRepository.deleteById(calendarEvent.id);
    });

    it('Should allow a caretaker to update a calendar event', async () => {
        await jwt.loginAs(caretaker.auth0Id);

        const data = {
            address: {
                description: 'Bruges, Belgium',
                geometry: { location: { lat: 51.2091807, lng: 3.2247552 } },
            },
            carecircleMemberIds: [],
            createdBy: caretaker.id,
            endTime: '2022-05-25 10:30:00+02',
            externalContactIds: [],
            id: '',
            pickedUp: true,
            plwdId: plwd.id,
            repeat: 'Never',
            startTime: '2022-05-25 10:00:00+02',
            title: 'Calendar Event',
        } as CalendarEvent;

        const response = await request(app.callback()).post(`/calendar-event/${plwd.id}`).send(data);
        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        const updatedData = {
            ...response.body.data,
            pickedUp: false,
            repeat: 'Monthly',
        } as CalendarEvent;

        const updateResponse = await request(app.callback()).patch(`/calendar-event/${plwd.id}`).send(updatedData);
        expect(updateResponse.status).toEqual(200);
        expect(updateResponse.body.success).toEqual(true);

        const calendarEvent = updateResponse.body.data as CalendarEvent;

        expect(calendarEvent.repeat).toEqual(updatedData.repeat);
        expect(calendarEvent.pickedUp).toEqual(updatedData.pickedUp);

        await calendarEventRepository.deleteById(calendarEvent.id);
    });

    it('Should allow a caretaker to delete a calendar event', async () => {
        await jwt.loginAs(caretaker.auth0Id);

        const data = {
            address: {
                description: 'Bruges, Belgium',
                geometry: { location: { lat: 51.2091807, lng: 3.2247552 } },
            },
            carecircleMemberIds: [],
            createdBy: caretaker.id,
            endTime: '2022-05-25 10:30:00+02',
            externalContactIds: [],
            id: '',
            pickedUp: true,
            plwdId: plwd.id,
            repeat: 'Never',
            startTime: '2022-05-25 10:00:00+02',
            title: 'Calendar Event',
        } as CalendarEvent;

        const response = await request(app.callback()).post(`/calendar-event/${plwd.id}`).send(data);
        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);
        const calendarEvent = response.body.data as CalendarEvent;

        const deleteResponse = await request(app.callback()).delete(`/calendar-event/${plwd.id}/${calendarEvent.id}`);

        expect(deleteResponse.status).toEqual(200);
        expect(deleteResponse.body.success).toEqual(true);
    });

    it('Should allow a caretaker to create a calendar event linked to a carecircle member', async () => {
        await jwt.loginAs(caretaker.auth0Id);

        await carecircleMemberRepository.addMember({
            ...membershipWithNoPermissions,
            plwdId: plwd.id,
            userId: carecircleMember.id,
        });

        const carecircle = await carecircleMemberRepository.getMembers(plwd.id);

        const data = {
            address: {
                description: 'Bruges, Belgium',
                geometry: { location: { lat: 51.2091807, lng: 3.2247552 } },
            },
            carecircleMemberIds: carecircle.map((c) => c.id),
            createdBy: caretaker.id,
            endTime: '2022-05-25 10:30:00+02',
            externalContactIds: [],
            id: '',
            pickedUp: true,
            plwdId: plwd.id,
            repeat: 'Never',
            startTime: '2022-05-25 10:00:00+02',
            title: 'Calendar Event',
        } as CalendarEvent;

        const response = await request(app.callback()).post(`/calendar-event/${plwd.id}`).send(data);
        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);
        const calendarEvent = response.body.data as CalendarEvent;
        expect(calendarEvent.carecircleMemberIds).toEqual(data.carecircleMemberIds);
        expect(calendarEvent.externalContactIds).toEqual(data.externalContactIds);

        const deleteResponse = await request(app.callback()).delete(`/calendar-event/${plwd.id}/${calendarEvent.id}`);

        expect(deleteResponse.status).toEqual(200);
        expect(deleteResponse.body.success).toEqual(true);

        await carecircleMemberRepository.removeMemberByUserId(plwd.id, carecircleMember.id);
    });

    it('Should allow a caretaker to create a calendar event linked to an external contact', async () => {
        await jwt.loginAs(caretaker.auth0Id);

        const externalContact = await externalContactRepository.insert({ ...externalContactUser, plwdId: plwd.id });

        const data = {
            address: {
                description: 'Bruges, Belgium',
                geometry: { location: { lat: 51.2091807, lng: 3.2247552 } },
            },
            carecircleMemberIds: [],
            createdBy: caretaker.id,
            endTime: '2022-05-25 10:30:00+02',
            externalContactIds: [externalContact.id],
            id: '',
            pickedUp: true,
            plwdId: plwd.id,
            repeat: 'Never',
            startTime: '2022-05-25 10:00:00+02',
            title: 'Calendar Event',
        } as CalendarEvent;

        const response = await request(app.callback()).post(`/calendar-event/${plwd.id}`).send(data);
        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);
        const calendarEvent = response.body.data as CalendarEvent;
        expect(calendarEvent.carecircleMemberIds).toEqual(data.carecircleMemberIds);
        expect(calendarEvent.externalContactIds).toEqual(data.externalContactIds);

        const deleteResponse = await request(app.callback()).delete(`/calendar-event/${plwd.id}/${calendarEvent.id}`);

        expect(deleteResponse.status).toEqual(200);
        expect(deleteResponse.body.success).toEqual(true);

        await externalContactRepository.remove(externalContact.id);
    });

    it('Should allow an admin to fetch all calendar events for a plwd', async () => {
        await jwt.loginAs(admin.auth0Id);

        const getResponse = await request(app.callback()).get(`/calendar-events/${plwd.id}`);

        expect(getResponse.status).toEqual(200);
        expect(getResponse.body.success).toEqual(true);
        expect(getResponse.body.data).toHaveLength(0);
    });

    it('Should allow a caretaker to fetch all calendar events for a plwd', async () => {
        await jwt.loginAs(caretaker.auth0Id);

        await carecircleMemberRepository.addMember({
            ...membershipWithNoPermissions,
            plwdId: plwd.id,
            userId: carecircleMember.id,
        });

        const carecircle = await carecircleMemberRepository.getMembers(plwd.id);
        const [carecircleLink] = carecircle;

        const data = {
            address: {
                description: 'Bruges, Belgium',
                geometry: { location: { lat: 51.2091807, lng: 3.2247552 } },
            },
            carecircleMemberIds: [carecircleLink.id],
            createdBy: caretaker.id,
            endTime: '2022-05-25 10:30:00+02',
            externalContactIds: [],
            id: '',
            pickedUp: true,
            plwdId: plwd.id,
            repeat: 'Never',
            startTime: '2022-05-25 10:00:00+02',
            title: 'Calendar Event',
        } as CalendarEvent;

        const response = await request(app.callback()).post(`/calendar-event/${plwd.id}`).send(data);
        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);
        const calendarEvent = response.body.data as CalendarEvent;

        const getResponse = await request(app.callback()).get(`/calendar-events/${plwd.id}`);
        expect(getResponse.status).toEqual(200);
        expect(getResponse.body.success).toEqual(true);
        expect(getResponse.body.data).toHaveLength(1);

        const [calendarEventWithContacts] = getResponse.body.data as CalendarEventWithContacts[];
        expect(calendarEventWithContacts.carecircleMembers).toHaveLength(1);
        const [persistedCarecircleMember] = calendarEventWithContacts.carecircleMembers;
        expect(persistedCarecircleMember.affiliation).toEqual(carecircleLink.affiliation);
        expect(persistedCarecircleMember.permissions).toEqual(carecircleLink.permissions);
        expect(persistedCarecircleMember.id).toEqual(carecircleLink.id);

        const deleteResponse = await request(app.callback()).delete(`/calendar-event/${plwd.id}/${calendarEvent.id}`);

        expect(deleteResponse.status).toEqual(200);
        expect(deleteResponse.body.success).toEqual(true);

        await carecircleMemberRepository.removeMemberByUserId(plwd.id, carecircleMember.id);
    });

    it('Should allow a carecircle member to fetch all calendar events for a plwd with read permissions', async () => {
        await jwt.loginAs(carecircleMember.auth0Id);

        await carecircleMemberRepository.addMember({
            ...membershipWithReadOnlyPermissions,
            userId: carecircleMember.id,
            plwdId: plwd.id,
        });

        const getResponse = await request(app.callback()).get(`/calendar-events/${plwd.id}`);

        expect(getResponse.status).toEqual(200);
        expect(getResponse.body.success).toEqual(true);
        expect(getResponse.body.data).toHaveLength(0);

        await carecircleMemberRepository.removeMemberByUserId(plwd.id, carecircleMember.id);
    });

    it('Should allow a carecircle member to fetch all calendar events for a plwd with manage permissions', async () => {
        await jwt.loginAs(carecircleMember.auth0Id);

        await carecircleMemberRepository.addMember({
            ...membershipWithManagePermissions,
            userId: carecircleMember.id,
            plwdId: plwd.id,
        });

        const getResponse = await request(app.callback()).get(`/calendar-events/${plwd.id}`);

        expect(getResponse.status).toEqual(200);
        expect(getResponse.body.success).toEqual(true);
        expect(getResponse.body.data).toHaveLength(0);

        await carecircleMemberRepository.removeMemberByUserId(plwd.id, carecircleMember.id);
    });

    it('Should not allow a carecircle member to fetch all calendar events for a plwd with no permissions', async () => {
        await jwt.loginAs(carecircleMember.auth0Id);

        await carecircleMemberRepository.addMember({
            ...membershipWithNoPermissions,
            userId: carecircleMember.id,
            plwdId: plwd.id,
        });

        const getResponse = await request(app.callback()).get(`/calendar-events/${plwd.id}`);

        expect(getResponse.status).toEqual(403);

        await carecircleMemberRepository.removeMemberByUserId(plwd.id, carecircleMember.id);
    });

    it('Should not allow a carecircle member to delete calendar events for a plwd with no permissions', async () => {
        await jwt.loginAs(carecircleMember.auth0Id);

        await carecircleMemberRepository.addMember({
            ...membershipWithNoPermissions,
            userId: carecircleMember.id,
            plwdId: plwd.id,
        });

        const getResponse = await request(app.callback()).del(`/calendar-event/${plwd.id}/test`);

        expect(getResponse.status).toEqual(403);

        await carecircleMemberRepository.removeMemberByUserId(plwd.id, carecircleMember.id);
    });

    it('Should not allow a carecircle member to delete calendar events for a plwd with read permissions', async () => {
        await jwt.loginAs(carecircleMember.auth0Id);

        await carecircleMemberRepository.addMember({
            ...membershipWithReadOnlyPermissions,
            userId: carecircleMember.id,
            plwdId: plwd.id,
        });

        const getResponse = await request(app.callback()).del(`/calendar-event/${plwd.id}/test`);

        expect(getResponse.status).toEqual(403);

        await carecircleMemberRepository.removeMemberByUserId(plwd.id, carecircleMember.id);
    });

    it('Should not allow a carecircle member to delete calendar events for a plwd with manage permissions', async () => {
        await jwt.loginAs(carecircleMember.auth0Id);

        await carecircleMemberRepository.addMember({
            ...membershipWithManagePermissions,
            userId: carecircleMember.id,
            plwdId: plwd.id,
        });

        const getResponse = await request(app.callback()).del(`/calendar-event/${plwd.id}/test`);

        expect(getResponse.status).toEqual(200);
        expect(getResponse.body.success).toEqual(true);

        await carecircleMemberRepository.removeMemberByUserId(plwd.id, carecircleMember.id);
    });
});
