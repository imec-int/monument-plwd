import { Knex } from 'knex';
import { ICarecircleMember, ICarecircleMemberBody } from 'src/models/CarecircleMember';
import logger from '../utils/logger';

const table = 'carecircle_members';

export const mapToCarecircleViewModel = (data: any) => ({
    affiliation: data.affiliation,
    id: data.id,
    permissions: data.permissions,
    plwdId: data.plwdId,
    user: {
        email: data.email,
        firstName: data.firstName,
        id: data.userId,
        lastName: data.lastName,
        phone: data.phone,
        picture: data.picture ?? '',
        role: data.role,
    },
});

export interface CarecircleMemberRepository {
    addMember(body: ICarecircleMemberBody): Promise<void>;
    getById(id: string): Promise<ICarecircleMember>;
    getByUserId(userId: string): Promise<ICarecircleMember[]>;
    getByUserIdAndPlwdId(userId: string, plwdId: string): Promise<ICarecircleMember>;
    getMembers(plwdId: string): Promise<ICarecircleMember[]>;
    removeMember(plwdId: string, id: string): Promise<void>;
    removeMemberByUserId(plwdId: string, userId: string): Promise<void>;
    updateMember(body: ICarecircleMemberBody): Promise<void>;
}

const addMember = (knex: Knex) => {
    return async (body: ICarecircleMemberBody) => {
        const profiler = logger.startTimer();
        const now = new Date();
        await knex(table).insert({
            affiliation: body.affiliation,
            created_at: now,
            id: body.id,
            permissions: body.permissions,
            plwd_user_id: body.plwdId,
            updated_at: now,
            user_id: body.userId,
        });
        profiler.done({ message: `Added user [${body.userId}] to carecircle of plwd [${body.plwdId}]` });
    };
};

const updateMember = (knex: Knex) => {
    return async (body: ICarecircleMemberBody) => {
        return knex.transaction(async (trx) => {
            const exists = await trx(table)
                .first('id', 'user_id AS userId')
                .where('plwd_user_id', body.plwdId)
                .andWhere('id', body.id);
            if (!exists) {
                throw new Error('Cannot update non-existent membership');
            }
            const profiler = logger.startTimer();
            const now = new Date();
            await trx(table)
                .update({
                    affiliation: body.affiliation,
                    permissions: body.permissions,
                    updated_at: now,
                })
                .where('id', exists.id);
            profiler.done({ message: `Update carecircle member [${exists.id}]` });
        });
    };
};

const getMembers = (knex: Knex) => {
    return async (plwdId: string) => {
        const profiler = logger.startTimer();
        const data = await knex(table)
            .select(
                `${table}.affiliation`,
                `${table}.permissions`,
                `${table}.id`,
                `${table}.plwd_user_id AS plwdId`,
                'users.id AS userId',
                'users.first_name AS firstName',
                'users.last_name AS lastName',
                'email',
                'phone',
                'picture',
                'role'
            )
            .join('users', 'users.id', `${table}.user_id`)
            .where(`${table}.plwd_user_id`, plwdId);
        profiler.done({ message: `Fetched ${data.length} carecircle member(s) for plwd [${plwdId}]` });
        return data.map(mapToCarecircleViewModel);
    };
};

const getByUserId = (knex: Knex) => {
    return async (userId: string) => {
        const profiler = logger.startTimer();
        const data = await knex(table)
            .select(
                `${table}.affiliation`,
                `${table}.permissions`,
                `${table}.id`,
                `${table}.plwd_user_id AS plwdId`,
                'users.id AS userId',
                'users.first_name AS firstName',
                'users.last_name AS lastName',
                'email',
                'phone',
                'picture',
                'role'
            )
            .join('users', 'users.id', `${table}.user_id`)
            .where(`${table}.user_id`, userId);
        profiler.done({ message: `User [${userId}] is part of ${data.length} carecircle(s)` });
        return data.map(mapToCarecircleViewModel);
    };
};

const getById = (knex: Knex) => {
    return async (id: string) => {
        const data = await knex(table)
            .first(
                `${table}.affiliation`,
                `${table}.permissions`,
                `${table}.id`,
                `${table}.plwd_user_id AS plwdId`,
                'users.id AS userId',
                'users.first_name AS firstName',
                'users.last_name AS lastName',
                'email',
                'phone',
                'picture',
                'role'
            )
            .join('users', 'users.id', `${table}.user_id`)
            .where(`${table}.id`, id);
        return data ? mapToCarecircleViewModel(data) : data;
    };
};

const getByUserIdAndPlwdId = (knex: Knex) => {
    return async (userId: string, plwdId: string) => {
        const profiler = logger.startTimer();
        const data = await knex(table)
            .first(
                `${table}.affiliation`,
                `${table}.permissions`,
                `${table}.id`,
                `${table}.plwd_user_id AS plwdId`,
                'users.id AS userId',
                'users.first_name AS firstName',
                'users.last_name AS lastName',
                'email',
                'phone',
                'picture',
                'role'
            )
            .join('users', 'users.id', `${table}.user_id`)
            .where(`${table}.user_id`, userId)
            .andWhere(`${table}.plwd_user_id`, plwdId);
        profiler.done({ message: `User [${userId}] is part of ${data?.length || 0} carecircle(s)` });
        return data ? mapToCarecircleViewModel(data) : data;
    };
};

const removeMember = (knex: Knex) => {
    return async (plwdId: string, id: string) => {
        const profiler = logger.startTimer();
        await knex(table).del().where({
            id,
            plwd_user_id: plwdId,
        });
        profiler.done({ message: `Removed user [${id}] from carecircle of PLWD [${plwdId}]` });
    };
};

const removeMemberByUserId = (knex: Knex) => {
    return async (plwdId: string, userId: string) => {
        const profiler = logger.startTimer();
        await knex(table).del().where({
            user_id: userId,
            plwd_user_id: plwdId,
        });
        profiler.done({ message: `Removed user [${userId}] from carecircle of PLWD [${plwdId}]` });
    };
};

const createCarecircleMemberRepository = (knex: Knex) => {
    return {
        addMember: addMember(knex),
        getById: getById(knex),
        getByUserId: getByUserId(knex),
        getByUserIdAndPlwdId: getByUserIdAndPlwdId(knex),
        getMembers: getMembers(knex),
        removeMember: removeMember(knex),
        removeMemberByUserId: removeMemberByUserId(knex),
        updateMember: updateMember(knex),
    } as CarecircleMemberRepository;
};

export default createCarecircleMemberRepository;
