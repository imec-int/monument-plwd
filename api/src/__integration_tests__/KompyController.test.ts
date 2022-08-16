import { Knex } from 'knex';
import Koa from 'koa';
import { initTestSetup } from './IntegrationTestUtils';
import { StartedPostgisContainer } from './PostgisContainer';
import request from 'supertest';
import { IConfig } from '../utils/config';
import { LogRepository } from 'src/repositories/LogRepository';
import { LogEvent } from '../models/Log';
import { LocationRepository } from 'src/repositories/LocationRepository';

let app: Koa;
let container: StartedPostgisContainer;
let database: Knex;
let config: IConfig;
let logRepository: LogRepository;
let locationRepository: LocationRepository;
let validBasicAuthToken: string;
let invalidBasicAuthToken: string;

beforeAll(async () => {
    ({
        app,
        config,
        container,
        database,
        repositories: { locationRepository, logRepository },
    } = await initTestSetup());

    const validBase64EncodedCredentials = Buffer.from(`${config.kompyClientAPI.authToken}`).toString('base64');
    const invalidBase64EncodedCredentials = Buffer.from('invalid:token').toString('base64');
    validBasicAuthToken = `Basic ${validBase64EncodedCredentials}`;
    invalidBasicAuthToken = `Basic ${invalidBase64EncodedCredentials}`;
});

afterAll(async () => {
    await database.destroy();
    await container.stop();
});

describe('KompyController', () => {
    it('Should not be able to access any route without authentication', async () => {
        const body = { hello: 'World!' };
        const postEventResponse = await request(app.callback()).post('/event').send(body);
        expect(postEventResponse.status).toEqual(401);

        const putEventResponse = await request(app.callback()).put('/event').send(body);
        expect(putEventResponse.status).toEqual(401);

        const postLocationResponse = await request(app.callback()).post('/location').send(body);
        expect(postLocationResponse.status).toEqual(401);
    });

    it('Should not be able to access any route without valid credentials', async () => {
        const body = { hello: 'World!' };

        const postEventResponse = await request(app.callback())
            .post('/location')
            .set('Authorization', invalidBasicAuthToken)
            .send(body);
        expect(postEventResponse.status).toEqual(401);

        const putEventResponse = await request(app.callback())
            .post('/location')
            .set('Authorization', invalidBasicAuthToken)
            .send(body);
        expect(putEventResponse.status).toEqual(401);

        const postLocationResponse = await request(app.callback())
            .post('/location')
            .set('Authorization', invalidBasicAuthToken)
            .send(body);
        expect(postLocationResponse.status).toEqual(401);
    });

    it('Should be able to authenticate with basic auth against the POST /event route', async () => {
        const body = {
            id: 'string',
            timestamp: '2022-08-08T12:53:05.522Z',
            status: 'open',
            description: 'string',
            type: 'alarm',
            category: 'care',
            position: {
                latitude: 'string',
                longitude: 'string',
                timestamp: '2022-08-08T12:53:05.522Z',
                accuracy: 'string',
                address: 'string',
            },
            device: {
                id: 'string',
                name: 'string',
                udid: 'string',
                phoneNumber: 'string',
            },
            organisation: {
                id: 'string',
                name: 'string',
            },
            initiator: {
                id: 'string',
                firstName: 'string',
                lastName: 'string',
                phoneNumber: 'string',
            },
            responder: {
                id: 'string',
                firstName: 'string',
                lastName: 'string',
                phoneNumber: 'string',
            },
        };

        const response = await request(app.callback())
            .post('/event')
            .set('Authorization', validBasicAuthToken)
            .send(body);
        expect(response.status).toEqual(200);
    });

    it('Should be able to authenticate with basic auth against the PUT /event route', async () => {
        const body = {
            id: 'string',
            timestamp: '2022-08-08T13:02:08.953Z',
            status: 'open',
            description: 'string',
            type: 'alarm',
            category: 'care',
            position: {
                latitude: 'string',
                longitude: 'string',
                timestamp: '2022-08-08T13:02:08.953Z',
                accuracy: 'string',
                address: 'string',
            },
            device: {
                id: 'string',
                name: 'string',
                udid: 'string',
                phoneNumber: 'string',
            },
            organisation: {
                id: 'string',
                name: 'string',
            },
            initiator: {
                id: 'string',
                firstName: 'string',
                lastName: 'string',
                phoneNumber: 'string',
            },
            responder: {
                id: 'string',
                firstName: 'string',
                lastName: 'string',
                phoneNumber: 'string',
            },
        };

        const response = await request(app.callback())
            .put('/event')
            .set('Authorization', validBasicAuthToken)
            .send(body);
        expect(response.status).toEqual(200);
    });

    it('Should be able to authenticate with basic auth against the POST /location route', async () => {
        const body = {
            timestamp: '2022-08-08T13:02:24.773Z',
            eventId: 'string',
            description: 'string',
            position: {
                latitude: '51.0800899',
                longitude: '3.7008819',
                timestamp: '2022-08-08T13:02:24.773Z',
                accuracy: 'string',
                address: 'string',
            },
            device: {
                id: 'uniquedeviceid',
                name: 'string',
                udid: 'IMEI',
                phoneNumber: 'string',
            },
            organisation: {
                id: 'string',
                name: 'string',
            },
        };

        const response = await request(app.callback())
            .post('/location')
            .set('Authorization', validBasicAuthToken)
            .send(body);
        expect(response.status).toEqual(200);

        const logs = await logRepository.get();
        const locations = await locationRepository.get();
        expect(logs).toHaveLength(1);
        expect(locations).toHaveLength(1);

        const [log] = logs;
        expect(log.payload).toEqual(body);
        expect(log.timestamp).toEqual(body.timestamp);
        expect(log.type).toEqual(LogEvent.KOMPY_LOCATION);
        expect(log.user).toEqual(body.device.udid);

        const [location] = locations;
        expect(location.userId).toEqual(body.device.udid);
        expect(location.timestamp).toEqual(body.timestamp);
        expect(location.location.lat).toEqual(Number(body.position.latitude));
        expect(location.location.lng).toEqual(Number(body.position.longitude));

        await logRepository.remove(log.id);
        await locationRepository.deleteById(location.id);
    });
});
