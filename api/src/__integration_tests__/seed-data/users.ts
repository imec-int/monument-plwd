import { Affiliation } from '../../models/CarecircleMember';
import { UserRole } from '../../models/UserRole';

export const plwdUser = {
    address: {
        description: 'Galnootlaan 2, Gand, Belgique',
        geometry: { location: { lat: 51.0801394, lng: 3.700802599999999 } },
    },
    email: 'plwd@monument.be',
    firstName: 'Person',
    lastName: 'Living with dementia',
    phone: '+32497887766',
    picture: 'https://pwld-picture.com',
    watchId: 'plwdwatchid',
};

export const caretakerUser = {
    auth0Id: 'auth0|caretaker',
    email: 'caretaker@monument.be',
    firstName: 'Caretaker',
    lastName: 'Monument',
    phone: '+32499737373',
    picture: 'https://caretaker-picture.com',
    role: UserRole.PRIMARY_CARETAKER,
};

export const carecircleMemberUser = {
    auth0Id: 'auth0|carecircle',
    email: 'caretaker@monument.be',
    firstName: 'Carecircle',
    lastName: 'Member',
    phone: '+32598848484',
    picture: 'https://carecircle-member-picture.com',
    role: UserRole.USER,
};

export const adminUser = {
    auth0Id: 'auth0|admin',
    email: 'admin@monument.be',
    firstName: 'Admin',
    lastName: 'Monument',
    phone: '+329876543210',
    picture: 'https://admin-picture.com',
    role: UserRole.ADMIN,
};

export const contactPersonUser = {
    email: 'contactperson@monument.be',
    firstName: 'Contact',
    lastName: 'Person',
    phone: '+32499887766',
    picture: 'https://contact-person-picture.com',
    role: UserRole.USER,
};

export const externalContactUser = {
    affiliation: Affiliation.FAMILY,
    email: 'externalcontactperson@monument.be',
    firstName: 'External',
    lastName: 'Contact',
    phone: '+32498000011',
    picture: 'https://external-contact-picture.com',
};

export const externalContactUser2 = {
    affiliation: Affiliation.FAMILY,
    email: 'externalcontactperson2@monument.be',
    firstName: 'External',
    lastName: 'Contact 2',
    phone: '+32498000012',
    picture: 'https://external-contact-picture-2.com',
};
