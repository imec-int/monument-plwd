import { Knex } from 'knex';
import logger from '../utils/logger';
import { ILog, Log } from '../models/Log';

export interface LogRepository {
    get(): Promise<ILog[]>;
    insert(logs: Log[]): Promise<void>;
    remove(id: string): Promise<void>;
}

const mapToViewModel = (data: any): ILog => ({
    id: data.id,
    payload: data.payload,
    timestamp: new Date(data.timestamp).toISOString(),
    user: data.user_id,
    type: data.type,
});

const get = (knex: Knex) => {
    return async () => {
        const profiler = logger.startTimer();
        const results = await knex('logs').select('*');
        profiler.done({ message: `Fetched ${results.length} log records` });
        return results.map(mapToViewModel);
    };
};

const insert = (knex: Knex) => {
    return async (logs: Log[]) => {
        const profiler = logger.startTimer();
        const now = new Date();
        const dbLogs = logs.map((log) => ({
            created_at: now,
            payload: log.payload,
            timestamp: new Date(log.timestamp),
            type: log.type,
            user_id: log.user,
        }));
        await knex('logs').insert(dbLogs);
        profiler.done({ message: `Saved ${logs.length} records` });
    };
};

const remove = (knex: Knex) => {
    return async (id: string) => {
        const profiler = logger.startTimer();
        await knex('logs').del().where({ id });
        profiler.done({ message: 'Removed 1 log record' });
    };
};

const createLogRepository = (knex: Knex) => {
    return {
        get: get(knex),
        insert: insert(knex),
        remove: remove(knex),
    } as LogRepository;
};

export default createLogRepository;
