import { Knex } from 'knex';
import Koa from 'koa';
import request from 'supertest';
import { initTestSetup } from './IntegrationTestUtils';
import { StartedPostgisContainer } from './PostgisContainer';

let app: Koa;
let container: StartedPostgisContainer;
let database: Knex;

beforeAll(async () => {
    ({ app, container, database } = await initTestSetup());
});

afterAll(async () => {
    await database.destroy();
    await container.stop();
});

describe('Koa healthcheck', () => {
    it('App healthcheck should return 200', async () => {
        const response = await request(app.callback()).get('/health');

        expect(response.status).toEqual(200);
        expect(response.body.status).toEqual('OK');
    });
});
