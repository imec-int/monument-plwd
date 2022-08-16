import { randomUUID } from 'crypto';
import { Knex } from 'knex';
import Koa from 'koa';
import { Affiliation } from '../models/CarecircleMember';
import { IUser } from '../models/User';
import { CarecircleMemberRepository } from 'src/repositories/CarecircleMemberRepository';
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
let carecircleMemberRepository: CarecircleMemberRepository;
let jwt: MockAuthorizationHeaderTransform;
let caretaker: IUser;
let admin: IUser;
let carecircleMember: IUser;
let database: Knex;

const address = { geometry: { location: { lng: 1, lat: 1 } } };

beforeAll(async () => {
    ({
        app,
        container,
        database,
        repositories: { plwdRepository, userRepository, carecircleMemberRepository },
        mockJwtHandler: jwt,
    } = await initTestSetup());
});

beforeEach(async () => {
    carecircleMember = await userRepository.insert(carecircleMemberUser);
    admin = await userRepository.insert(adminUser);
    caretaker = await userRepository.insert(caretakerUser);
});

afterEach(async () => {
    await userRepository.deleteById(caretaker.id);
    await userRepository.deleteById(admin.id);
    await userRepository.deleteById(carecircleMember.id);
});

afterAll(async () => {
    await database.destroy();
    await container.stop();
});

describe('PlwdController', () => {
    it('Should not allow to create a plwd when body is invalid', async () => {
        await jwt.loginAs(caretaker.auth0Id);

        const data = {
            address: JSON.stringify({ description: 'Haha, invalid address' }),
            caretakerId: caretaker.id,
            email: 'test.user@gmail.com',
            firstName: 'Patient Living',
            lastName: 'With Dementia',
            phone: '+32477665533',
            picture: '',
        };

        const response = await request(app.callback()).post('/plwd').send(data);

        expect(response.status).toEqual(400);
    });

    it('Should allow a caretaker to create a plwd', async () => {
        await jwt.loginAs(caretaker.auth0Id);

        const data = {
            address: address,
            caretakerId: caretaker.id,
            email: 'test.user@gmail.com',
            firstName: 'Patient Living',
            lastName: 'With Dementia',
            phone: '+32477665533',
            picture: '',
        };

        const response = await request(app.callback()).post('/plwd').send(data);

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        const plwd = response.body.data;

        expect(plwd.address).toEqual(address);
        expect(plwd.caretakerId).toEqual(caretaker.id);
        expect(plwd.email).toEqual(data.email);
        expect(plwd.firstName).toEqual(data.firstName);
        expect(plwd.lastName).toEqual(data.lastName);
        expect(plwd.phone).toEqual(data.phone);
        expect(plwd.picture).toEqual(data.picture);

        expect(plwd.caretaker.user.id).toEqual(caretaker.id);
        expect(plwd.caretaker.plwdId).toEqual(plwd.id);
        expect(plwd.caretaker.affiliation).toEqual(Affiliation.PRIMARY_CARETAKER);

        await carecircleMemberRepository.removeMemberByUserId(plwd.id, plwd.caretaker.user.id);
        await plwdRepository.deleteById(plwd.id);
    });

    it('Should allow an admin to create a plwd', async () => {
        await jwt.loginAs(admin.auth0Id);

        const data = {
            address: address,
            caretakerId: caretaker.id,
            email: 'test.user@gmail.com',
            firstName: 'Patient Living',
            lastName: 'With Dementia',
            phone: '+32477665533',
            picture: '',
        };

        const response = await request(app.callback()).post('/plwd').send(data);
        const plwd = await plwdRepository.getByCaretakerAuth0Id(caretaker.auth0Id);
        const _carecircleMember = await carecircleMemberRepository.getByUserIdAndPlwdId(
            plwd?.caretakerId ?? '',
            plwd?.id ?? ''
        );

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        await carecircleMemberRepository.removeMemberByUserId(plwd?.id ?? '', _carecircleMember.user.id);
        await plwdRepository.deleteById(plwd?.id ?? '');
    });

    it('Should not allow a normal user to create a plwd', async () => {
        await jwt.loginAs(carecircleMember.auth0Id);

        const data = {
            address: address,
            caretakerId: caretaker.id,
            email: 'test.user@gmail.com',
            firstName: 'Patient Living',
            lastName: 'With Dementia',
            phone: '+32477665533',
            picture: '',
        };

        const response = await request(app.callback()).post('/plwd').send(data);

        expect(response.status).toEqual(403);
    });

    it('Should allow a caretaker to update a plwd', async () => {
        await jwt.loginAs(caretaker.auth0Id);

        const data = {
            address: address,
            caretakerId: caretaker.id,
            email: 'test.user@gmail.com',
            firstName: 'Patient Living',
            lastName: 'With Dementia',
            phone: '+32477665533',
            picture: '',
        };

        const response = await request(app.callback()).post('/plwd').send(data);

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        const updatedData = {
            firstName: 'Patient Living',
            lastName: 'With Young Dementia',
            picture: 'updated-picture.png',
        };

        const plwd = await plwdRepository.getByCaretakerAuth0Id(caretaker.auth0Id);

        const updateResponse = await request(app.callback())
            .patch(`/plwd/${plwd?.id}`)
            .send({
                ...plwd,
                ...updatedData,
            });

        expect(updateResponse.status).toEqual(200);
        expect(updateResponse.body.success).toEqual(true);

        const updatedPlwd = await plwdRepository.getByCaretakerAuth0Id(caretaker.auth0Id);
        const _carecircleMember = await carecircleMemberRepository.getByUserIdAndPlwdId(
            updatedPlwd?.caretakerId ?? '',
            updatedPlwd?.id ?? ''
        );

        expect(updatedPlwd?.address).toEqual(address);
        expect(updatedPlwd?.caretakerId).toEqual(caretaker.id);
        expect(updatedPlwd?.email).toEqual(data.email);
        expect(updatedPlwd?.firstName).toEqual(updatedData.firstName);
        expect(updatedPlwd?.lastName).toEqual(updatedData.lastName);
        expect(updatedPlwd?.phone).toEqual(data.phone);
        expect(updatedPlwd?.picture).toEqual(updatedData.picture);

        await carecircleMemberRepository.removeMemberByUserId(plwd?.id ?? '', _carecircleMember.user.id);
        await plwdRepository.deleteById(updatedPlwd?.id ?? '');
    });

    it('Should allow an admin to update a plwd', async () => {
        await jwt.loginAs(admin.auth0Id);

        const data = {
            address: address,
            caretakerId: caretaker.id,
            email: 'test.user@gmail.com',
            firstName: 'Patient Living',
            lastName: 'With Dementia',
            phone: '+32477665533',
            picture: '',
        };

        const response = await request(app.callback()).post('/plwd').send(data);

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        const updatedData = {
            firstName: 'Patient Living',
            lastName: 'With Young Dementia',
            picture: 'updated-picture.png',
        };

        const plwd = await plwdRepository.getByCaretakerAuth0Id(caretaker.auth0Id);

        const updateResponse = await request(app.callback())
            .patch(`/plwd/${plwd?.id}`)
            .send({
                ...plwd,
                ...updatedData,
            });

        expect(updateResponse.status).toEqual(200);
        expect(updateResponse.body.success).toEqual(true);

        const updatedPlwd = await plwdRepository.getByCaretakerAuth0Id(caretaker.auth0Id);
        const _carecircleMember = await carecircleMemberRepository.getByUserIdAndPlwdId(
            updatedPlwd?.caretakerId ?? '',
            updatedPlwd?.id ?? ''
        );

        expect(updatedPlwd?.address).toEqual(address);
        expect(updatedPlwd?.caretakerId).toEqual(caretaker.id);
        expect(updatedPlwd?.email).toEqual(data.email);
        expect(updatedPlwd?.firstName).toEqual(updatedData.firstName);
        expect(updatedPlwd?.lastName).toEqual(updatedData.lastName);
        expect(updatedPlwd?.phone).toEqual(data.phone);
        expect(updatedPlwd?.picture).toEqual(updatedData.picture);

        await carecircleMemberRepository.removeMemberByUserId(plwd?.id ?? '', _carecircleMember.user.id);
        await plwdRepository.deleteById(updatedPlwd?.id ?? '');
    });

    it('Should allow a carecircle member with required permission to update a plwd', async () => {
        await jwt.loginAs(admin.auth0Id);

        const data = {
            address: address,
            caretakerId: caretaker.id,
            email: 'test.user@gmail.com',
            firstName: 'Patient Living',
            lastName: 'With Dementia',
            phone: '+32477665533',
            picture: '',
        };

        const response = await request(app.callback()).post('/plwd').send(data);

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        const updatedData = {
            firstName: 'Patient Living',
            lastName: 'With Young Dementia',
            picture: 'updated-picture.png',
        };

        await jwt.loginAs(carecircleMember.auth0Id);
        const plwd = await plwdRepository.getByCaretakerAuth0Id(caretaker.auth0Id);
        const plwdId = plwd?.id as string;
        await carecircleMemberRepository.addMember({
            affiliation: 'Family',
            id: randomUUID(),
            permissions: JSON.stringify(['manage:carecircle']),
            plwdId,
            userId: carecircleMember.id,
        });

        const updateResponse = await request(app.callback())
            .patch(`/plwd/${plwdId}`)
            .send({
                ...plwd,
                ...updatedData,
            });

        expect(updateResponse.status).toEqual(200);
        expect(updateResponse.body.success).toEqual(true);

        const updatedPlwd = await plwdRepository.getByCaretakerAuth0Id(caretaker.auth0Id);
        const caretakerCarecircleMember = await carecircleMemberRepository.getByUserIdAndPlwdId(
            updatedPlwd?.caretakerId ?? '',
            updatedPlwd?.id ?? ''
        );

        expect(updatedPlwd?.address).toEqual(address);
        expect(updatedPlwd?.caretakerId).toEqual(caretaker.id);
        expect(updatedPlwd?.email).toEqual(data.email);
        expect(updatedPlwd?.firstName).toEqual(updatedData.firstName);
        expect(updatedPlwd?.lastName).toEqual(updatedData.lastName);
        expect(updatedPlwd?.phone).toEqual(data.phone);
        expect(updatedPlwd?.picture).toEqual(updatedData.picture);

        await carecircleMemberRepository.removeMemberByUserId(plwdId, caretakerCarecircleMember.user.id);
        await carecircleMemberRepository.removeMemberByUserId(plwdId, carecircleMember.id);
        await plwdRepository.deleteById(updatedPlwd?.id ?? '');
    });

    it('Should not allow a carecircle member with missing permission to update a plwd', async () => {
        await jwt.loginAs(admin.auth0Id);

        const data = {
            address: address,
            caretakerId: caretaker.id,
            email: 'test.user@gmail.com',
            firstName: 'Patient Living',
            lastName: 'With Dementia',
            phone: '+32477665533',
            picture: '',
        };

        const response = await request(app.callback()).post('/plwd').send(data);

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        const updatedData = {
            firstName: 'Patient Living',
            lastName: 'With Young Dementia',
            picture: 'updated-picture.png',
        };

        await jwt.loginAs(carecircleMember.auth0Id);
        const plwd = await plwdRepository.getByCaretakerAuth0Id(caretaker.auth0Id);
        const caretakerCarecircleMember = await carecircleMemberRepository.getByUserIdAndPlwdId(
            plwd?.caretakerId ?? '',
            plwd?.id ?? ''
        );
        const plwdId = plwd?.id as string;
        await carecircleMemberRepository.addMember({
            affiliation: 'Family',
            id: randomUUID(),
            permissions: JSON.stringify([]),
            plwdId,
            userId: carecircleMember.id,
        });

        const updateResponse = await request(app.callback())
            .patch(`/plwd/${plwdId}`)
            .send({
                ...plwd,
                ...updatedData,
            });

        expect(updateResponse.status).toEqual(403);
        await carecircleMemberRepository.removeMemberByUserId(plwdId, carecircleMember.id);
        await carecircleMemberRepository.removeMemberByUserId(plwdId, caretakerCarecircleMember.user.id);
        await plwdRepository.deleteById(plwdId);
    });

    it('Should allow an admin to view plwd data', async () => {
        const plwd = await plwdRepository.insert({ ...plwdUser, caretakerId: caretaker.id });
        await jwt.loginAs(admin.auth0Id);

        const response = await request(app.callback()).get(`/plwd/${plwd.id}`);

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        await plwdRepository.deleteById(plwd.id);
    });

    it('Should allow a caretaker to view plwd data', async () => {
        const plwd = await plwdRepository.insert({ ...plwdUser, caretakerId: caretaker.id });
        await jwt.loginAs(caretaker.auth0Id);

        const response = await request(app.callback()).get(`/plwd/${plwd.id}`);

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        await plwdRepository.deleteById(plwd.id);
    });

    it('Should allow a user to view plwd data when part of the carecircle', async () => {
        const plwd = await plwdRepository.insert({ ...plwdUser, caretakerId: caretaker.id });
        await carecircleMemberRepository.addMember({
            affiliation: 'Family',
            id: randomUUID(),
            permissions: JSON.stringify([]),
            plwdId: plwd.id,
            userId: carecircleMember.id,
        });
        await jwt.loginAs(carecircleMember.auth0Id);

        const response = await request(app.callback()).get(`/plwd/${plwd.id}`);

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        await carecircleMemberRepository.removeMemberByUserId(plwd.id, carecircleMember.id);
        await plwdRepository.deleteById(plwd.id);
    });

    it('Should not allow a user to view plwd data when not part of the carecircle', async () => {
        const plwd = await plwdRepository.insert({ ...plwdUser, caretakerId: caretaker.id });
        await jwt.loginAs(carecircleMember.auth0Id);

        const response = await request(app.callback()).get(`/plwd/${plwd.id}`);

        expect(response.status).toEqual(403);

        await plwdRepository.deleteById(plwd.id);
    });
});
