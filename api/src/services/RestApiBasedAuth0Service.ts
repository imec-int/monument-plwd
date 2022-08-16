import axios, { AxiosResponse } from 'axios';
import logger from '../utils/logger';
import { IConfig } from 'src/utils/config';
import { generatePassword } from '../utils/password';
import { concatUrls } from '../utils/concatUrls';

export type Auth0AuthorisationConfig = {
    domain: string;
    audience: string;
};

export type Auth0Config = IConfig['auth0'];

export type Auth0UserDetails = {
    name: string;
    email: string;
};

export interface Auth0Service {
    hasUser(email: string): Promise<boolean>;
    getUser(email: string): Promise<Auth0User | undefined>;
    createUser(user: Auth0UserDetails): Promise<void>;
    deleteUser(email: string): Promise<void>;
}

export interface Auth0User {
    user_id: string;
    email?: string;
    email_verified: boolean;
    phone_number?: string;
    app_metadata?: any;
    identities?: {
        connection: string;
        user_id: string;
        provider: string;
        isSocial: boolean;
    }[];
}

interface TokenInfo {
    access_token: string;
    token_type: string;
    expires_in: number;
    maxAge: number; // timestamp in ms when token will be expired
}

const createAuthorizationHeader = (token: TokenInfo) => ({
    Authorization: `${token.token_type} ${token.access_token}`,
});

const logResponse = (response: AxiosResponse) => {
    const { status, statusText, data } = response;

    logger.debug('Data: %s', JSON.stringify(data));
    logger.debug('Status: %s', status);
    logger.debug('Status text: %s', statusText);
};

const getAccessToken = (config: Auth0Config) => async () => {
    logger.debug('Requesting API token on Auth0');

    const response = await axios.post(config.m2m.tokenUrl, {
        client_id: config.m2m.clientId,
        client_secret: config.m2m.clientSecret,
        audience: config.m2m.audience,
        grant_type: 'client_credentials',
    });

    const { status, statusText, data } = response;

    if (status === 200 && data.access_token) {
        logger.debug(`Auth: Got Authenticated! token will expire in ${data.expires_in} seconds!`);

        return {
            access_token: data.access_token,
            token_type: data.token_type,
            expires_in: data.expires_in,
            maxAge: Date.now() + data.expires_in * 1000,
        } as TokenInfo;
    } else {
        logger.error('Failed to get token: ', response.statusText);
        throw new Error(`Auth0: Could not get access token ${status} (${statusText})`);
    }
};

const cachedToken = (delegate: () => Promise<TokenInfo>) => {
    let currentToken: TokenInfo | null = null;

    return async () => {
        if (currentToken === null || currentToken.maxAge < Date.now()) {
            currentToken = await delegate();
        }
        return currentToken;
    };
};

export class RestApiBasedAuth0Service implements Auth0Service {
    private readonly auth0Config: Auth0Config;
    private readonly getApiToken: () => Promise<TokenInfo>;

    constructor(auth0Config: Auth0Config) {
        this.auth0Config = auth0Config;

        this.getApiToken = cachedToken(getAccessToken(auth0Config));
    }

    async createUser(user: Auth0UserDetails) {
        const token = await this.getApiToken();

        try {
            const createUserResponse = await this.createUserInAuth0(user, token);

            if (!RestApiBasedAuth0Service.isSuccessful(createUserResponse)) {
                throw new Error('Failed to create user');
            }
        } catch (e) {
            logger.error('Failed to create user: ' + JSON.stringify(user), e);
            throw e;
        }
    }

    private static isSuccessful<T>(createUserResponse: AxiosResponse<T>) {
        return 200 <= createUserResponse.status && createUserResponse.status < 300;
    }

    private async createUserInAuth0(user: Auth0UserDetails, token: TokenInfo) {
        const { email } = user;

        const body = {
            connection: 'Username-Password-Authentication',
            email_verified: false,
            email: email.toLowerCase(),
            name: user.name,
            password: generatePassword(24),
            app_metadata: {},
        };
        const createUserURL = concatUrls(this.auth0Config.m2m.baseUrl, '/api/v2/users');
        return await axios.post<Auth0User>(createUserURL, body, {
            headers: {
                'Content-Type': 'application/json',
                ...createAuthorizationHeader(token),
            },
        });
    }

    async fetchUser(email: string) {
        const accessToken = await this.getApiToken();

        const url = concatUrls(this.auth0Config.m2m.baseUrl, '/api/v2/users-by-email');
        const result = await axios.get(url, {
            params: {
                email: email.toLowerCase(),
            },
            headers: { ...createAuthorizationHeader(accessToken) },
        });

        return result;
    }

    async getUser(email: string) {
        const result = await this.fetchUser(email);

        if (result?.status === 200 && result?.data.length > 0) {
            return result.data[0] as Auth0User;
        }
    }

    async hasUser(email: string) {
        const result = await this.fetchUser(email);

        logResponse(result);
        return result?.status === 200 && result?.data.length > 0;
    }

    async deleteUser(email: string): Promise<void> {
        const user = await this.getUser(email);
        if (user) {
            const accessToken = await this.getApiToken();
            const url = concatUrls(this.auth0Config.m2m.baseUrl, '/api/v2/users/', user.user_id);

            await axios.delete(url, {
                headers: { ...createAuthorizationHeader(accessToken) },
            });
        }
    }
}
