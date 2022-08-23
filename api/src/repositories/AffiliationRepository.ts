import { ICreateAffiliation, IAffiliation } from './../models/Affiliation';
import { randomUUID } from 'crypto';
import { Knex } from 'knex';
import logger from '../utils/logger';

const table = 'affiliations';

export interface AffiliationRepository {
    getByPlwdId: (plwdId: string) => Promise<IAffiliation[]>;
    insert(externalContact: ICreateAffiliation): Promise<IAffiliation>;
    remove(id: string): Promise<void>;
}

export const mapToAffiliationViewModel = (data: any): IAffiliation => ({
    affiliation: data.affiliation,
    id: data.id,
    plwdId: data.plwd_id,
});

const insert = (knex: Knex) => {
    return async (affiliation: ICreateAffiliation) => {
        const profiler = logger.startTimer();

        // Re-use the external_contact entry if he already exists
        const newAffiliation = {
            affiliation: affiliation.affiliation,
            id: randomUUID(),
            plwd_id: affiliation.plwdId,
        };
        await knex(table).insert(newAffiliation);
        const result: IAffiliation = mapToAffiliationViewModel(newAffiliation);

        profiler.done({ message: `Saved affiliation for plwd ${affiliation.plwdId}` });
        return result;
    };
};

const remove = (knex: Knex) => {
    return async (id: string) => {
        await knex(table).del().where({ id });
    };
};

// get external contacts by plwdId
const getByPlwdId = (knex: Knex) => {
    return async (plwdId: string) => {
        const profiler = logger.startTimer();
        const affiliations = await knex(table).where('plwd_id', plwdId).select('*');
        profiler.done({ message: `Retrieved affiliations by plwdId ${plwdId}` });
        return affiliations.map(mapToAffiliationViewModel);
    };
};

const createAffiliationRepository = (knex: Knex) => {
    return {
        insert: insert(knex),
        remove: remove(knex),
        getByPlwdId: getByPlwdId(knex),
    } as AffiliationRepository;
};

export default createAffiliationRepository;
