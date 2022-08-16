import { UserRole } from './UserRole';

export interface IUser {
    auth0Id: string;
    email: string;
    firstName: string;
    id: string;
    lastName: string;
    phone: string;
    picture: string;
    role: UserRole;
}

export class User {
    id: string;

    constructor(user: { id: string }) {
        this.id = user.id;
    }
}
