import jwt from 'koa-jwt';
import jwksRsa from 'jwks-rsa';
import compose from 'koa-compose';
import jwtDecode from 'jwt-decode';

import { User } from '../models/User';
import { Auth0Config } from '../services/RestApiBasedAuth0Service';
import { Middleware } from 'koa';

const auth0Middleware = (config: Auth0Config) => {
    return jwt({
        secret: jwksRsa.koaJwtSecret({
            cache: true,
            rateLimit: true,
            jwksRequestsPerMinute: 2,
            jwksUri: `https://${config.jwt.domain}/.well-known/jwks.json`,
        }),
        audience: config.jwt.audience,
        algorithms: ['RS256'],
    });
};

type JwtTokenPayload = {
    iss: string;
    sub: string;
    aud: string[];
    iat: number;
    exp: number;
    azp: string;
    scope: string;
};

const extractUserFromJwtToken: Middleware = async (context, next) => {
    const authorizationHeader = (context.headers.authorization ?? 'Bearer ') as string;
    const decodedToken = jwtDecode<JwtTokenPayload>(authorizationHeader);
    // Note: we can inject more data from auth0 (e.g. emailVerified, email) here if necessary
    context.user = new User({ id: decodedToken.sub });

    await next();
};

export const createAuthorizationMiddleware = (config: Auth0Config) =>
    compose([auth0Middleware(config), extractUserFromJwtToken]);
