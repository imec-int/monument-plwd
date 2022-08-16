import logger from '../utils/logger';
import { Auth0Service, Auth0UserDetails, Auth0User } from '../services/RestApiBasedAuth0Service';

export class MockAuth0Service implements Auth0Service {
    private users: string[] = [];
    private returnErrorOnCreate = false;

    hasUser(email: string): Promise<boolean> {
        return Promise.resolve(this.users.indexOf(email) >= 0);
    }

    getUser(email: string): Promise<Auth0User> {
        return Promise.resolve({ email: email, email_verified: true } as Auth0User);
    }

    createUser(user?: Auth0UserDetails): Promise<void> {
        if (this.returnErrorOnCreate) {
            throw new Error('Unable to create user');
        }
        if (user) {
            this.users.push(user.email);
        }
        // success once we get here
        return Promise.resolve();
    }

    willReturnError() {
        this.returnErrorOnCreate = true;
    }

    alreadyRegisteredUser(email: string) {
        logger.info('Registering email %s', email);
        this.users.push(email);
    }

    deleteUser(email: string): Promise<void> {
        this.users = this.users.filter((u) => u !== email);
        return Promise.resolve();
    }
}
