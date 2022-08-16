import { Context, Next } from 'koa';
import compose from 'koa-compose';
import logger from '../utils/logger';
import { IConfig } from '../utils/config';

const extractAndVerifyAuthorizationHeader = (config: IConfig) => {
    const basicAuthToken = config.kompyClientAPI.authToken;

    return async (context: Context, next: Next) => {
        const [, base64Token] = (context.request.headers.authorization ?? 'Basic ').split(' ');

        if (!base64Token) {
            logger.info('No authorization token was provided');

            context.status = 401;
            context.message = 'Unauthenticated';

            return;
        }

        if (basicAuthToken !== Buffer.from(base64Token, 'base64').toString()) {
            logger.error('Authorization token is invalid');

            context.status = 401;
            context.message = 'Unauthenticated';

            return;
        }

        await next();
    };
};

export const createKompyAuthorizationMiddleware = (config: IConfig) =>
    compose([extractAndVerifyAuthorizationHeader(config)]);
