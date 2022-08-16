import { Knex } from 'knex';
import logger from '../utils/logger';
import { IUser } from '../models/User';
import { randomUUID } from 'crypto';

type ICreateUserBody = Omit<IUser, 'createdAt' | 'updatedAt' | 'id'>;
type IUpdateUserBody = Omit<IUser, 'createdAt' | 'updatedAt' | 'createdBy' | 'auth0Id'>;

export interface UserRepository {
    deleteById(id: string): Promise<void>;
    get(): Promise<IUser[]>;
    getPlwd(): Promise<IUser>;
    getUserByAuth0Id(auth0Id: string): Promise<IUser>;
    getUserByEmail(email: string): Promise<IUser>;
    getUserByEmailAndPhone(email: string, phone: string): Promise<IUser>;
    getUserById(id: string): Promise<IUser>;
    insert(user: ICreateUserBody): Promise<IUser>;
    update(user: IUpdateUserBody): Promise<IUser>;
}

export const transformUserToViewModel = (data: any): IUser => ({
    auth0Id: data.auth0_id,
    email: data.email,
    firstName: data.first_name,
    id: data.id,
    lastName: data.last_name,
    phone: data.phone,
    picture: data.picture ?? '',
    role: data.role,
});

const insert = (knex: Knex) => {
    return async (user: ICreateUserBody) => {
        try {
            const now = new Date();
            const id = randomUUID();
            const newUser = {
                auth0_id: user.auth0Id,
                created_at: now,
                email: user.email,
                first_name: user.firstName,
                id,
                role: user.role,
                last_name: user.lastName,
                phone: user.phone,
                picture: user.picture,
                updated_at: now,
            };
            await knex('users').insert(newUser);

            return await getUserById(knex)(id);
        } catch (error) {
            logger.error(`Saving user`, error);
            throw error;
        }
    };
};

const update = (knex: Knex) => {
    return async (user: IUpdateUserBody) => {
        try {
            const now = new Date();
            await knex('users')
                .update({
                    email: user.email,
                    first_name: user.firstName,
                    last_name: user.lastName,
                    phone: user.phone,
                    picture: user.picture,
                    role: user.role,
                    updated_at: now,
                })
                .where('id', user.id);

            return await getUserById(knex)(user.id);
        } catch (error) {
            logger.error(`Updating user`, error);
            throw error;
        }
    };
};

const get = (knex: Knex) => {
    return async () => {
        const message = `Fetching users`;
        const profiler = logger.startTimer();
        const result = await knex('users').select('*');
        profiler.done({ message });
        return result.map(transformUserToViewModel);
    };
};

const getUserByAuth0Id = (knex: Knex) => {
    return async (auth0Id: string) => {
        const message = `Fetching user by auth0Id [${auth0Id}]`;
        const profiler = logger.startTimer();
        const result = await knex('users').first('*').where('auth0_id', auth0Id);
        profiler.done({ message });
        return result ? transformUserToViewModel(result) : result;
    };
};

const getUserById = (knex: Knex) => {
    return async (id: string) => {
        const message = `Fetching user by id [${id}]`;
        const profiler = logger.startTimer();
        const result = await knex('users').first('*').where('id', id);
        profiler.done({ message });
        return result ? transformUserToViewModel(result) : result;
    };
};

const getUserByEmailAndPhone = (knex: Knex) => {
    return async (email: string, phone: string) => {
        const message = `Fetching user by email and phone [${email} ${phone}]`;
        const profiler = logger.startTimer();
        const result = await knex('users').first('*').where('email', email).andWhere('phone', phone);
        profiler.done({ message });
        return result ? transformUserToViewModel(result) : result;
    };
};

const getUserByEmail = (knex: Knex) => {
    return async (email: string) => {
        const message = `Fetching user by email [${email}]`;
        const profiler = logger.startTimer();
        const result = await knex('users').first('*').where('email', email);
        profiler.done({ message });
        return result ? transformUserToViewModel(result) : result;
    };
};

const getPlwd = (knex: Knex) => {
    return async () => {
        const message = `Fetching plwd`;
        const profiler = logger.startTimer();
        const result = await knex('users').first('*').where('role', 'plwd');
        profiler.done({ message });
        return result ? transformUserToViewModel(result) : result;
    };
};

const deleteById = (knex: Knex) => {
    return async (id: string) => {
        const message = `Delete user`;
        const profiler = logger.startTimer();
        await knex('users').where({ id: id }).del();
        profiler.done({ message });
    };
};

const createUserRepository = (knex: Knex) => {
    return {
        deleteById: deleteById(knex),
        get: get(knex),
        getPlwd: getPlwd(knex),
        getUserByAuth0Id: getUserByAuth0Id(knex),
        getUserById: getUserById(knex),
        getUserByEmail: getUserByEmail(knex),
        getUserByEmailAndPhone: getUserByEmailAndPhone(knex),
        insert: insert(knex),
        update: update(knex),
    } as UserRepository;
};

export default createUserRepository;
