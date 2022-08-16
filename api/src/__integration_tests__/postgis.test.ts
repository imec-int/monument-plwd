import { Client } from 'pg';
import { PostgisContainer } from './PostgisContainer';
import { initTestSetup } from './IntegrationTestUtils';

// Tests based on testcontainers documentation, see below for more information:
// https://github.com/testcontainers/testcontainers-node/tree/master/src/modules/postgresql
describe('PostgisContainer', () => {
    jest.setTimeout(180_000);

    it('should work', async () => {
        const container = await new PostgisContainer().start();

        const client = new Client({
            host: container.getHost(),
            port: container.getPort(),
            database: container.getDatabase(),
            user: container.getUsername(),
            password: container.getPassword(),
        });
        await client.connect();

        const result = await client.query('SELECT 1');
        expect(result.rows[0]).toEqual({ '?column?': 1 });

        await client.end();
        await container.stop();
    });

    it('should set database', async () => {
        const container = await new PostgisContainer().withDatabase('customDatabase').start();

        const client = new Client({
            host: container.getHost(),
            port: container.getPort(),
            database: container.getDatabase(),
            user: container.getUsername(),
            password: container.getPassword(),
        });
        await client.connect();

        const result = await client.query('SELECT current_database()');
        expect(result.rows[0]).toEqual({ current_database: 'customDatabase' });

        await client.end();
        await container.stop();
    });

    it('should set username', async () => {
        const container = await new PostgisContainer().withUsername('customUsername').start();

        const client = new Client({
            host: container.getHost(),
            port: container.getPort(),
            database: container.getDatabase(),
            user: container.getUsername(),
            password: container.getPassword(),
        });
        await client.connect();

        const result = await client.query('SELECT current_user');
        expect(result.rows[0]).toEqual({ current_user: 'customUsername' });

        await client.end();
        await container.stop();
    });

    it('should expose a connection string', async () => {
        const container = await new PostgisContainer().start();

        const expectedConnectionStringFormat = `postgresql://${container.getUsername()}:${container.getPassword()}@localhost:${container.getPort()}/${container.getDatabase()}`;
        const connectionStringFromContainer = container.getConnectionString();

        expect(connectionStringFromContainer).toEqual(expectedConnectionStringFormat);

        await container.stop();
    });

    it('should migrate to latest database schema', async () => {
        const { database, container } = await initTestSetup();

        const results = await database('locations').select('*');
        expect(results).toHaveLength(0);

        await database.destroy();
        await container.stop();
    });
});
