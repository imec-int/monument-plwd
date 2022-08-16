import { Knex } from 'knex';
import Koa from 'koa';
import { IUser } from 'src/models/User';
import { UserRepository } from 'src/repositories/UserRepository';
import request from 'supertest';
import { initTestSetup, MockAuthorizationHeaderTransform } from './IntegrationTestUtils';
import { StartedPostgisContainer } from './PostgisContainer';
import { adminUser, caretakerUser } from './seed-data/users';

let app: Koa;
let container: StartedPostgisContainer;
let userRepository: UserRepository;
let jwt: MockAuthorizationHeaderTransform;
let caretaker: IUser;
let admin: IUser;
let database: Knex;

beforeAll(async () => {
    ({
        app,
        container,
        database,
        repositories: { userRepository },
        mockJwtHandler: jwt,
    } = await initTestSetup());
});

beforeEach(async () => {
    admin = await userRepository.insert(adminUser);
    caretaker = await userRepository.insert(caretakerUser);
});

afterEach(async () => {
    await userRepository.deleteById(admin.id);
    await userRepository.deleteById(caretaker.id);
});

afterAll(async () => {
    await database.destroy();
    await container.stop();
});

describe('UserController', () => {
    it('Should allow a logged in user to find himself', async () => {
        await jwt.loginAs(caretaker.auth0Id);

        const response = await request(app.callback()).get('/users/me');

        expect(response.status).toEqual(200);
        expect(response.body.id).toEqual(caretaker.auth0Id);
    });

    it('Should allow a logged in user to get his own data', async () => {
        await jwt.loginAs(caretaker.auth0Id);

        const response = await request(app.callback()).get(`/user/${caretaker.auth0Id}`);

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);
        expect(response.body.data.email).toEqual(caretaker.email);
        expect(response.body.data.firstName).toEqual(caretaker.firstName);
        expect(response.body.data.lastName).toEqual(caretaker.lastName);
        expect(response.body.data.phone).toEqual(caretaker.phone);
        expect(response.body.data.picture).toEqual(caretaker.picture);
        expect(response.body.data.role).toEqual(caretaker.role);
    });

    it('Should allow an admin to get data of other users', async () => {
        await jwt.loginAs(admin.auth0Id);

        const response = await request(app.callback()).get(`/user/${caretaker.auth0Id}`);

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);
        expect(response.body.data.email).toEqual(caretaker.email);
        expect(response.body.data.firstName).toEqual(caretaker.firstName);
        expect(response.body.data.lastName).toEqual(caretaker.lastName);
        expect(response.body.data.phone).toEqual(caretaker.phone);
        expect(response.body.data.picture).toEqual(caretaker.picture);
        expect(response.body.data.role).toEqual(caretaker.role);
    });

    it('Should not allow a logged in user to get data of someone else', async () => {
        await jwt.loginAs(caretaker.auth0Id);
        const response = await request(app.callback()).get(`/user/${admin.auth0Id}`);

        expect(response.status).toEqual(403);
    });

    it('Should allow a caretaker to create a new user', async () => {
        await jwt.loginAs(caretaker.auth0Id);

        const data = {
            user: {
                address: 'Hello there!',
                firstName: 'Test',
                lastName: 'User',
                email: 'test.user@gmail.com',
                phone: '+32477665544',
                picture: '',
                affiliation: 'Family',
                role: 'User',
            },
        };

        const response = await request(app.callback()).post('/user').send(data);

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);
        expect(response.body.data.id).not.toBeNull();

        const uuid = response.body.data.id;
        const storedUser = await userRepository.getUserById(uuid);
        await userRepository.deleteById(uuid);

        expect(storedUser.email).toEqual(data.user.email);
        expect(storedUser.firstName).toEqual(data.user.firstName);
        expect(storedUser.lastName).toEqual(data.user.lastName);
        expect(storedUser.phone).toEqual(data.user.phone);
        expect(storedUser.picture).toEqual(data.user.picture);
        expect(storedUser.role).toEqual(data.user.role);
    });

    it('Should allow a logged in user to update his profile', async () => {
        await jwt.loginAs(caretaker.auth0Id);

        const updatedCaretakerUser = {
            ...caretaker,
            firstName: 'Updated Admin',
            lastName: 'Monument is mine',
        };
        const response = await request(app.callback()).patch(`/user/${caretaker.id}`).send({
            user: updatedCaretakerUser,
        });

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);
        expect(response.body.data.firstName).toEqual(updatedCaretakerUser.firstName);
        expect(response.body.data.lastName).toEqual(updatedCaretakerUser.lastName);
    });

    it('Should allow an admin to delete a user', async () => {
        await jwt.loginAs(admin.auth0Id);

        const data = {
            user: {
                address: 'Hello there!',
                firstName: 'Test',
                lastName: 'User',
                email: 'test.user@gmail.com',
                phone: '+32477665544',
                picture: '',
                affiliation: 'Family',
                role: 'User',
            },
        };

        const response = await request(app.callback()).post('/user').send(data);

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);
        expect(response.body.data.id).not.toBeNull();

        const createdUserId = response.body.data.id;

        const deleteResponse = await request(app.callback()).del(`/user/${createdUserId}`);
        expect(deleteResponse.status).toEqual(200);
        expect(deleteResponse.body.success).toEqual(true);
    });

    it('Should not allow a caretaker to delete a user', async () => {
        await jwt.loginAs(caretaker.auth0Id);

        const data = {
            user: {
                address: 'Hello there!',
                firstName: 'Test',
                lastName: 'User',
                email: 'test.user@gmail.com',
                phone: '+32477665544',
                picture: '',
                affiliation: 'Family',
                role: 'User',
            },
        };

        const response = await request(app.callback()).post('/user').send(data);

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);
        expect(response.body.data.id).not.toBeNull();

        const createdUserId = response.body.data.id;

        const deleteResponse = await request(app.callback()).del(`/user/${createdUserId}`);
        expect(deleteResponse.status).toEqual(403);

        await userRepository.deleteById(createdUserId);
    });

    it('Should not allow a user to update his email', async () => {
        await jwt.loginAs(admin.auth0Id);

        const data = {
            user: {
                address: 'Hello there!',
                firstName: 'Test',
                lastName: 'User',
                email: 'test.user@gmail.com',
                phone: '+32477665544',
                picture: '',
                affiliation: 'Family',
                role: 'User',
            },
        };

        const response = await request(app.callback()).post('/user').send(data);

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);
        expect(response.body.data.id).not.toBeNull();

        const createdUserId = response.body.data.id;

        const updateData = {
            user: { ...data.user, email: 'test.changed.user@gmail.com' },
        };
        const updateResponse = await request(app.callback()).patch(`/user/${createdUserId}`).send(updateData);
        expect(updateResponse.status).toEqual(409);
        expect(updateResponse.text).toEqual('Cannot update email of a user');

        const deleteResponse = await request(app.callback()).del(`/user/${createdUserId}`);
        expect(deleteResponse.status).toEqual(200);
        expect(deleteResponse.body.success).toEqual(true);
    });

    it('Should not allow another user to update a user', async () => {
        await jwt.loginAs(admin.auth0Id);

        const data = {
            user: {
                address: 'Hello there!',
                firstName: 'Test',
                lastName: 'User',
                email: 'test.user@gmail.com',
                phone: '+32477665544',
                picture: '',
                affiliation: 'Family',
                role: 'User',
            },
        };

        const response = await request(app.callback()).post('/user').send(data);

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);
        expect(response.body.data.id).not.toBeNull();
        const createdUserId = response.body.data.id;

        await jwt.loginAs(caretaker.auth0Id);
        const updateData = {
            user: { ...data.user, email: 'test.changed.user@gmail.com' },
        };
        const updateResponse = await request(app.callback()).patch(`/user/${createdUserId}`).send(updateData);
        expect(updateResponse.status).toEqual(403);

        await jwt.loginAs(admin.auth0Id);
        const deleteResponse = await request(app.callback()).del(`/user/${createdUserId}`);
        expect(deleteResponse.status).toEqual(200);
        expect(deleteResponse.body.success).toEqual(true);
    });

    it('Should now allow to create duplicate accounts with the same email', async () => {
        await jwt.loginAs(admin.auth0Id);

        const data = {
            user: {
                ...adminUser,
            },
        };

        const response = await request(app.callback()).post('/user').send(data);
        expect(response.status).toEqual(409);
        expect(response.text).toEqual(`User with ${data.user.email} already exists`);
    });
});
