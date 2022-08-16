import { Knex } from 'knex';
import Koa from 'koa';
import { IPlwd } from 'src/models/Plwd';
import { IUser } from 'src/models/User';
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
import { ExternalContactsRepository } from 'src/repositories/ExternalContactsRepository';
import { CarecircleMemberRepository } from 'src/repositories/CarecircleMemberRepository';

let app: Koa;
let container: StartedPostgisContainer;
let externalContactRepository: ExternalContactsRepository;
let userRepository: UserRepository;
let plwdRepository: PlwdRepository;
let carecircleMemberRepository: CarecircleMemberRepository;
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
        repositories: { externalContactRepository, carecircleMemberRepository, plwdRepository, userRepository },
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
    await plwdRepository.deleteById(plwd.id);
    await userRepository.deleteById(carecircleMember.id);
    await userRepository.deleteById(admin.id);
    await userRepository.deleteById(caretaker.id);
});

afterAll(async () => {
    await database.destroy();
    await container.stop();
});

describe('ExternalContactController', () => {
    it('Should allow an admin to create an external contact', async () => {
        await jwt.loginAs(admin.auth0Id);

        const data = {
            ...externalContactUser,
            plwdId: plwd.id,
        };

        const response = await request(app.callback()).post(`/external-contact/${plwd.id}`).send(data);
        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        const externalContacts = await externalContactRepository.getByPlwdId(plwd.id);
        expect(externalContacts).toHaveLength(1);

        const [externalContact] = externalContacts;
        expect(externalContact.id).toBeDefined();
        expect(externalContact.affiliation).toEqual(data.affiliation);
        expect(externalContact.user.email).toEqual(data.email);
        expect(externalContact.user.firstName).toEqual(data.firstName);
        expect(externalContact.user.lastName).toEqual(data.lastName);
        expect(externalContact.user.phone).toEqual(data.phone);
        expect(externalContact.plwdId).toEqual(plwd.id);

        await externalContactRepository.remove(externalContact.id);
    });

    it('Should allow a caretaker to create an external contact', async () => {
        await jwt.loginAs(caretaker.auth0Id);

        const data = {
            ...externalContactUser,
            plwdId: plwd.id,
        };

        const response = await request(app.callback()).post(`/external-contact/${plwd.id}`).send(data);
        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        const externalContacts = await externalContactRepository.getByPlwdId(plwd.id);
        expect(externalContacts).toHaveLength(1);

        const [externalContact] = externalContacts;
        expect(externalContact.id).toBeDefined();
        expect(externalContact.affiliation).toEqual(data.affiliation);
        expect(externalContact.user.email).toEqual(data.email);
        expect(externalContact.user.firstName).toEqual(data.firstName);
        expect(externalContact.user.lastName).toEqual(data.lastName);
        expect(externalContact.user.phone).toEqual(data.phone);
        expect(externalContact.plwdId).toEqual(plwd.id);

        await externalContactRepository.remove(externalContact.id);
    });

    it('Should allow a carecircle member with manage permissions to create an external contact', async () => {
        await jwt.loginAs(carecircleMember.auth0Id);

        const data = {
            ...externalContactUser,
            plwdId: plwd.id,
        };

        const membership = {
            ...membershipWithManagePermissions,
            plwdId: plwd.id,
            userId: carecircleMember.id,
        };
        await carecircleMemberRepository.addMember(membership);

        const response = await request(app.callback()).post(`/external-contact/${plwd.id}`).send(data);
        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        const externalContacts = await externalContactRepository.getByPlwdId(plwd.id);
        expect(externalContacts).toHaveLength(1);

        const [externalContact] = externalContacts;
        expect(externalContact.id).toBeDefined();
        expect(externalContact.affiliation).toEqual(data.affiliation);
        expect(externalContact.user.email).toEqual(data.email);
        expect(externalContact.user.firstName).toEqual(data.firstName);
        expect(externalContact.user.lastName).toEqual(data.lastName);
        expect(externalContact.user.phone).toEqual(data.phone);
        expect(externalContact.plwdId).toEqual(plwd.id);

        await externalContactRepository.remove(externalContact.id);
        await carecircleMemberRepository.removeMemberByUserId(plwd.id, carecircleMember.id);
    });

    it('Should not allow a carecircle member with read permissions to create an external contact', async () => {
        await jwt.loginAs(carecircleMember.auth0Id);

        const data = {
            ...externalContactUser,
            plwdId: plwd.id,
        };

        const membership = {
            ...membershipWithReadOnlyPermissions,
            plwdId: plwd.id,
            userId: carecircleMember.id,
        };
        await carecircleMemberRepository.addMember(membership);

        const response = await request(app.callback()).post(`/external-contact/${plwd.id}`).send(data);
        expect(response.status).toEqual(403);

        await carecircleMemberRepository.removeMemberByUserId(plwd.id, carecircleMember.id);
    });

    it('Should not allow a carecircle member with no permissions to create an external contact', async () => {
        await jwt.loginAs(carecircleMember.auth0Id);

        const data = {
            ...externalContactUser,
            plwdId: plwd.id,
        };

        const membership = {
            ...membershipWithNoPermissions,
            plwdId: plwd.id,
            userId: carecircleMember.id,
        };
        await carecircleMemberRepository.addMember(membership);

        const response = await request(app.callback()).post(`/external-contact/${plwd.id}`).send(data);
        expect(response.status).toEqual(403);

        await carecircleMemberRepository.removeMemberByUserId(plwd.id, carecircleMember.id);
    });

    it('Should allow an admin to get external contacts', async () => {
        await jwt.loginAs(admin.auth0Id);

        const data = {
            ...externalContactUser,
            plwdId: plwd.id,
        };

        const response = await request(app.callback()).post(`/external-contact/${plwd.id}`).send(data);
        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        const getResponse = await request(app.callback()).get(`/external-contacts/${plwd.id}`);
        expect(getResponse.status).toEqual(200);
        expect(getResponse.body.success).toEqual(true);
        const externalContacts = getResponse.body.data;
        expect(externalContacts).toHaveLength(1);

        const [externalContact] = externalContacts;
        expect(externalContact.id).toBeDefined();
        expect(externalContact.affiliation).toEqual(data.affiliation);
        expect(externalContact.user.email).toEqual(data.email);
        expect(externalContact.user.firstName).toEqual(data.firstName);
        expect(externalContact.user.lastName).toEqual(data.lastName);
        expect(externalContact.user.phone).toEqual(data.phone);
        expect(externalContact.plwdId).toEqual(plwd.id);

        await externalContactRepository.remove(externalContact.id);
    });

    it('Should allow a caretaker to get external contacts', async () => {
        await jwt.loginAs(caretaker.auth0Id);

        const data = {
            ...externalContactUser,
            plwdId: plwd.id,
        };

        const response = await request(app.callback()).post(`/external-contact/${plwd.id}`).send(data);
        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        const getResponse = await request(app.callback()).get(`/external-contacts/${plwd.id}`);
        expect(getResponse.status).toEqual(200);
        expect(getResponse.body.success).toEqual(true);
        const externalContacts = getResponse.body.data;
        expect(externalContacts).toHaveLength(1);

        const [externalContact] = externalContacts;
        expect(externalContact.id).toBeDefined();
        expect(externalContact.affiliation).toEqual(data.affiliation);
        expect(externalContact.user.email).toEqual(data.email);
        expect(externalContact.user.firstName).toEqual(data.firstName);
        expect(externalContact.user.lastName).toEqual(data.lastName);
        expect(externalContact.user.phone).toEqual(data.phone);
        expect(externalContact.plwdId).toEqual(plwd.id);

        await externalContactRepository.remove(externalContact.id);
    });

    it('Should allow a carecircle member with manage permissions to get external contacts', async () => {
        await jwt.loginAs(carecircleMember.auth0Id);

        const data = {
            ...externalContactUser,
            plwdId: plwd.id,
        };

        const membership = {
            ...membershipWithManagePermissions,
            plwdId: plwd.id,
            userId: carecircleMember.id,
        };
        await carecircleMemberRepository.addMember(membership);

        const response = await request(app.callback()).post(`/external-contact/${plwd.id}`).send(data);
        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        const getResponse = await request(app.callback()).get(`/external-contacts/${plwd.id}`);
        expect(getResponse.status).toEqual(200);
        expect(getResponse.body.success).toEqual(true);
        const externalContacts = getResponse.body.data;
        expect(externalContacts).toHaveLength(1);

        const [externalContact] = externalContacts;
        expect(externalContact.id).toBeDefined();
        expect(externalContact.affiliation).toEqual(data.affiliation);
        expect(externalContact.user.email).toEqual(data.email);
        expect(externalContact.user.firstName).toEqual(data.firstName);
        expect(externalContact.user.lastName).toEqual(data.lastName);
        expect(externalContact.user.phone).toEqual(data.phone);
        expect(externalContact.plwdId).toEqual(plwd.id);

        await externalContactRepository.remove(externalContact.id);
        await carecircleMemberRepository.removeMemberByUserId(plwd.id, carecircleMember.id);
    });

    it('Should allow a carecircle member with read permissions to get external contacts', async () => {
        await jwt.loginAs(admin.auth0Id);

        const data = {
            ...externalContactUser,
            plwdId: plwd.id,
        };

        const membership = {
            ...membershipWithReadOnlyPermissions,
            plwdId: plwd.id,
            userId: carecircleMember.id,
        };
        await carecircleMemberRepository.addMember(membership);

        const response = await request(app.callback()).post(`/external-contact/${plwd.id}`).send(data);
        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        await jwt.loginAs(carecircleMember.auth0Id);

        const getResponse = await request(app.callback()).get(`/external-contacts/${plwd.id}`);
        expect(getResponse.status).toEqual(200);
        expect(getResponse.body.success).toEqual(true);
        const externalContacts = getResponse.body.data;
        expect(externalContacts).toHaveLength(1);

        const [externalContact] = externalContacts;
        expect(externalContact.id).toBeDefined();
        expect(externalContact.affiliation).toEqual(data.affiliation);
        expect(externalContact.user.email).toEqual(data.email);
        expect(externalContact.user.firstName).toEqual(data.firstName);
        expect(externalContact.user.lastName).toEqual(data.lastName);
        expect(externalContact.user.phone).toEqual(data.phone);
        expect(externalContact.plwdId).toEqual(plwd.id);

        await externalContactRepository.remove(externalContact.id);
        await carecircleMemberRepository.removeMemberByUserId(plwd.id, carecircleMember.id);
    });

    it('Should not allow a carecircle member with no permissions to get external contacts', async () => {
        await jwt.loginAs(carecircleMember.auth0Id);

        const membership = {
            ...membershipWithNoPermissions,
            plwdId: plwd.id,
            userId: carecircleMember.id,
        };
        await carecircleMemberRepository.addMember(membership);

        const response = await request(app.callback()).get(`/external-contacts/${plwd.id}`);
        expect(response.status).toEqual(403);

        await carecircleMemberRepository.removeMemberByUserId(plwd.id, carecircleMember.id);
    });
});
