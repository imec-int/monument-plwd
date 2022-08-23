import { membershipWithReadOnlyPermissions, membershipWithManagePermissions } from './seed-data/carecircleMembership';
import { CarecircleMemberRepository } from 'src/repositories/CarecircleMemberRepository';
import { AffiliationRepository } from 'src/repositories/AffiliationRepository';
import { Knex } from 'knex';
import Koa from 'koa';
import { IPlwd } from 'src/models/Plwd';
import { IUser } from 'src/models/User';
import { PlwdRepository } from 'src/repositories/PlwdRepository';
import { UserRepository } from 'src/repositories/UserRepository';
import request from 'supertest';
import { initTestSetup, MockAuthorizationHeaderTransform } from './IntegrationTestUtils';
import { StartedPostgisContainer } from './PostgisContainer';
import { adminUser, carecircleMemberUser, caretakerUser, plwdUser } from './seed-data/users';

let app: Koa;
let container: StartedPostgisContainer;
let userRepository: UserRepository;
let plwdRepository: PlwdRepository;
let affiliationRepository: AffiliationRepository;
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
        repositories: { affiliationRepository, carecircleMemberRepository, plwdRepository, userRepository },
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

describe('AffiliationController', () => {
    it('Should not allow to create a plwd when body is invalid', async () => {
        await jwt.loginAs(admin.auth0Id);

        const data = {
            aff: '',
            plwdId: plwd.id,
        };

        const response = await request(app.callback()).post(`/affiliation/${plwd.id}`).send(data);

        expect(response.status).toEqual(400);
    });
    it('Should not allow a carecircle member to add an affiliation with read permission', async () => {
        await jwt.loginAs(carecircleMember.auth0Id);

        await carecircleMemberRepository.addMember({
            ...membershipWithReadOnlyPermissions,
            userId: carecircleMember.id,
            plwdId: plwd.id,
        });

        const data = {
            affiliation: 'friends',
            plwdId: plwd.id,
        };

        const response = await request(app.callback()).post(`/affiliation/${plwd.id}`).send(data);

        expect(response.status).toEqual(403);

        await carecircleMemberRepository.removeMemberByUserId(plwd.id, carecircleMember.id);
    });

    it('Should allow a carecircle member to add an affiliation with manage permission', async () => {
        await jwt.loginAs(carecircleMember.auth0Id);

        await carecircleMemberRepository.addMember({
            ...membershipWithManagePermissions,
            userId: carecircleMember.id,
            plwdId: plwd.id,
        });

        const data = {
            affiliation: 'friends',
            plwdId: plwd.id,
        };

        const response = await request(app.callback()).post(`/affiliation/${plwd.id}`).send(data);
        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        const affiliations = await affiliationRepository.getByPlwdId(plwd.id);
        expect(affiliations).toHaveLength(1);

        const [affiliation] = affiliations;
        expect(affiliation.id).toBeDefined();
        expect(affiliation.affiliation).toEqual(data.affiliation);
        expect(affiliation.plwdId).toEqual(plwd.id);

        await affiliationRepository.remove(affiliation.id);
        await carecircleMemberRepository.removeMemberByUserId(plwd.id, carecircleMember.id);
    });
    it('Should allow an admin to create an affiliation', async () => {
        await jwt.loginAs(admin.auth0Id);

        const data = {
            affiliation: 'friends',
            plwdId: plwd.id,
        };

        const response = await request(app.callback()).post(`/affiliation/${plwd.id}`).send(data);
        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        const affiliations = await affiliationRepository.getByPlwdId(plwd.id);
        expect(affiliations).toHaveLength(1);

        const [affiliation] = affiliations;
        expect(affiliation.id).toBeDefined();
        expect(affiliation.affiliation).toEqual(data.affiliation);
        expect(affiliation.plwdId).toEqual(plwd.id);

        await affiliationRepository.remove(affiliation.id);
    });

    it('Should not allow the creation of a global affiliation even with lowercase', async () => {
        await jwt.loginAs(admin.auth0Id);

        const data = {
            affiliation: 'family',
            plwdId: plwd.id,
        };

        const response = await request(app.callback()).post(`/affiliation/${plwd.id}`).send(data);
        expect(response.status).toEqual(409);
    });
});
