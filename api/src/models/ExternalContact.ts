export type IExternalContact = {
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

export type ICreateExternalContactBody = {
    affiliation: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    plwdId: string;
};
