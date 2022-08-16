import { randomUUID } from 'crypto';
import { Knex } from 'knex';
import { IPlwd } from '../models/Plwd';
import logger from '../utils/logger';

const table = 'plwd';

const fields = [
    'id',
    'first_name AS firstName',
    'last_name AS lastName',
    'caretaker_id AS caretakerId',
    'address',
    'email',
    'phone',
    'picture',
    'watch_id AS watchId',
];

export type IPlwdCreateBody = Omit<IPlwd, 'id'>;

export interface PlwdRepository {
    deleteById(plwdId: string): Promise<void>;
    get(plwdId: string): Promise<IPlwd | undefined>;
    getAll(): Promise<IPlwd[]>;
    getByCaretakerAuth0Id(caretakerAuth0Id: string): Promise<IPlwd | undefined>;
    getByWatchId(watchId: string): Promise<IPlwd | undefined>;
    insert(plwd: IPlwdCreateBody): Promise<IPlwd>;
    update(plwd: IPlwd): Promise<IPlwd>;
}

const mapToViewModel = (data: any) => {
    if (!data) return data;

    return {
        ...data,
        address: JSON.parse(data.address),
    };
};

const getAll = (knex: Knex) => {
    return async () => {
        const plwds = await knex(table).select<IPlwd[]>(...fields);

        return plwds.map(mapToViewModel);
    };
};

const get = (knex: Knex) => {
    return async (plwdId: string) => {
        const plwd = await knex(table)
            .first<IPlwd | undefined>(...fields)
            .where({ id: plwdId });

        return mapToViewModel(plwd);
    };
};

const getByCaretakerAuth0Id = (knex: Knex) => {
    return async (caretakerAuth0Id: string) => {
        const caretaker = await knex('users').first('id').where({ auth0_id: caretakerAuth0Id });
        if (!caretaker) return caretaker;

        const plwd = await knex(table)
            .first<IPlwd | undefined>(...fields)
            .where({ caretaker_id: caretaker.id });

        return mapToViewModel(plwd);
    };
};

const getByWatchId = (knex: Knex) => {
    return async (watchId: string) => {
        const plwd = await knex(table)
            .first<IPlwd | undefined>(...fields)
            .where({ watch_id: watchId });

        return mapToViewModel(plwd);
    };
};

const insert = (knex: Knex) => {
    return async (plwd: IPlwdCreateBody) => {
        const now = new Date();
        const profiler = logger.startTimer();
        const newPlwd = {
            ...plwd,
            id: randomUUID(),
        } as IPlwd;
        await knex(table).insert({
            address: newPlwd.address,
            caretaker_id: newPlwd.caretakerId,
            email: newPlwd.email,
            first_name: newPlwd.firstName,
            id: newPlwd.id,
            last_name: newPlwd.lastName,
            phone: newPlwd.phone,
            picture: newPlwd.picture,
            created_at: now,
            updated_at: now,
            watch_id: newPlwd.watchId,
        });
        profiler.done({ message: `Added new plwd [${newPlwd.id}]` });
        return newPlwd;
    };
};

const update = (knex: Knex) => {
    return async (plwd: IPlwd) => {
        const profiler = logger.startTimer();
        await knex(table)
            .update({
                address: plwd.address,
                caretaker_id: plwd.caretakerId,
                email: plwd.email,
                first_name: plwd.firstName,
                last_name: plwd.lastName,
                phone: plwd.phone,
                picture: plwd.picture,
                watch_id: plwd.watchId,
            })
            .where(`id`, plwd.id);
        profiler.done({ message: `Updated plwd ${plwd.id}` });
        return plwd;
    };
};

const deleteById = (knex: Knex) => {
    return async (plwdId: string) => {
        const profiler = logger.startTimer();
        await knex(table).del().where({
            id: plwdId,
        });
        profiler.done({ message: `Removed plwd [${plwdId}]` });
    };
};

const createPlwdRepository = (knex: Knex) => {
    return {
        deleteById: deleteById(knex),
        get: get(knex),
        getAll: getAll(knex),
        getByCaretakerAuth0Id: getByCaretakerAuth0Id(knex),
        getByWatchId: getByWatchId(knex),
        insert: insert(knex),
        update: update(knex),
    } as PlwdRepository;
};

export default createPlwdRepository;
