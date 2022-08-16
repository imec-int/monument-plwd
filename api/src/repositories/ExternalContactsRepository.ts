import { ICreateExternalContactBody, IExternalContact } from './../models/ExternalContact';
import { randomUUID } from 'crypto';
import { Knex } from 'knex';
import logger from '../utils/logger';
import { UserRole } from '../models/UserRole';

const table = 'external_contacts';

export interface ExternalContactsRepository {
    getByMailAndPlwdId: (externalContact: ICreateExternalContactBody) => Promise<IExternalContact>;
    getByPhoneAndPlwdId: (externalContact: ICreateExternalContactBody) => Promise<IExternalContact>;
    getByPlwdId: (plwdId: string) => Promise<IExternalContact[]>;
    insert(externalContact: ICreateExternalContactBody): Promise<IExternalContact>;
    remove(id: string): Promise<void>;
}

export const mapToExternalContactViewModel = (data: any): IExternalContact => ({
    affiliation: data.affiliation,
    id: data.id,
    permissions: [],
    plwdId: data.plwd_user_id,
    user: {
        email: data.email,
        firstName: data.first_name,
        id: data.id,
        lastName: data.last_name,
        phone: data.phone,
        role: UserRole.EXTERNAL_CONTACT,
        picture: '',
    },
});

const insert = (knex: Knex) => {
    return async (externalContact: ICreateExternalContactBody) => {
        const profiler = logger.startTimer();
        const now = new Date();

        // Re-use the external_contact entry if he already exists
        const newExternalContact = {
            affiliation: externalContact.affiliation,
            created_at: now,
            email: externalContact.email,
            first_name: externalContact.firstName,
            id: randomUUID(),
            last_name: externalContact.lastName,
            phone: externalContact.phone,
            plwd_user_id: externalContact.plwdId,
            updated_at: now,
        };
        await knex(table).insert(newExternalContact);
        const result: IExternalContact = mapToExternalContactViewModel(newExternalContact);

        profiler.done({ message: `Saved external contact` });
        return result;
    };
};

// get external contacts by plwdId
const getByPlwdId = (knex: Knex) => {
    return async (plwdId: string) => {
        const profiler = logger.startTimer();
        const externalContacts = await knex(table).where('plwd_user_id', plwdId).select('*');
        profiler.done({ message: `Retrieved external contacts by plwdId` });
        return externalContacts.map(mapToExternalContactViewModel);
    };
};

// get external contacts by Mail and plwdId
const getByMailAndPlwdId = (knex: Knex) => {
    return async (externalContact: ICreateExternalContactBody) => {
        const profiler = logger.startTimer();
        // Check if externalcontact already exists by phone or email and plwdId
        const result = await knex(table)
            .where('email', externalContact.email)
            .andWhere('plwd_user_id', externalContact.plwdId)
            .first('*');
        profiler.done({ message: `Retrieved external contacts by plwdId` });
        return result ? mapToExternalContactViewModel(result) : result;
    };
};

// get external contacts by Phone and plwdId
const getByPhoneAndPlwdId = (knex: Knex) => {
    return async (externalContact: ICreateExternalContactBody) => {
        const profiler = logger.startTimer();
        // Check if externalcontact already exists by phone or email and plwdId
        const result = await knex(table)
            .where('phone', externalContact.phone)
            .andWhere('plwd_user_id', externalContact.plwdId)
            .first('*');
        profiler.done({ message: `Retrieved external contacts by plwdId` });
        return result ? mapToExternalContactViewModel(result) : result;
    };
};

const remove = (knex: Knex) => {
    return async (id: string) => {
        await knex(table).del().where({ id });
    };
};

const createExternalContactsRepository = (knex: Knex) => {
    return {
        insert: insert(knex),
        remove: remove(knex),
        getByMailAndPlwdId: getByMailAndPlwdId(knex),
        getByPhoneAndPlwdId: getByPhoneAndPlwdId(knex),
        getByPlwdId: getByPlwdId(knex),
    } as ExternalContactsRepository;
};

export default createExternalContactsRepository;
