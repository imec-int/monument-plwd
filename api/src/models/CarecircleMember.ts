export enum Affiliation {
    FAMILY = 'Family',
    FRIEND = 'Friend',
    HAIRDRESSER = 'Hairdresser',
    NURSE = 'Nurse',
    ODENSA = 'Odensa Contact',
    PRIMARY_CARETAKER = 'Primary Caretaker',
}

export type ICarecircleMember = {
    affiliation: string;
    id: string;
    permissions: string[];
    plwdId: string;
    user: {
        email: string;
        firstName: string;
        id: string;
        lastName: string;
        phone: string;
        picture: string;
        role: string;
    };
};

export type ICarecircleMemberBody = {
    affiliation: string;
    id: string;
    permissions: string;
    plwdId: string;
    userId: string;
};
