import knex, { Knex } from 'knex';
import type { Logger } from 'winston';

export const createDb = (connectionString: string, logger: Logger) => {
    const knexInstance = knex({
        client: 'pg',
        connection: connectionString,
    });

    // Verify database connection
    knexInstance.raw('select 1+1 as result').catch((err) => {
        logger.error('Failed to query database: %s', err);
        process.exit(1);
    });

    return knexInstance;
};

export const migrateDatabase = async (knexInstance: Knex) => {
    await knexInstance.migrate.latest();
};
