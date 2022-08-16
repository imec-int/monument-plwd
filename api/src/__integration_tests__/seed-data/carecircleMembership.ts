import { randomUUID } from 'crypto';
import { Affiliation } from '../../models/CarecircleMember';

export const membershipWithNoPermissions = {
    affiliation: Affiliation.ODENSA,
    id: randomUUID(),
    permissions: JSON.stringify(['when-assigned:locations', 'never:calendar', 'never:carecircle']),
};

export const membershipWithReadOnlyPermissions = {
    affiliation: Affiliation.NURSE,
    id: randomUUID(),
    permissions: JSON.stringify(['when-assigned:locations', 'read:calendar', 'read:carecircle']),
};

export const membershipWithManagePermissions = {
    affiliation: Affiliation.FAMILY,
    id: randomUUID(),
    permissions: JSON.stringify(['always:locations', 'manage:calendar', 'manage:carecircle']),
};

export const caretakerMembership = {
    affiliation: Affiliation.PRIMARY_CARETAKER,
    id: randomUUID(),
    permissions: JSON.stringify([]),
};
