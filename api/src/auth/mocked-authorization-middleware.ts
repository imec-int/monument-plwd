import { User } from 'src/models/User';
import Koa from 'koa';

type AuthorizationHeaderTransform = (bearerToken: string) => Promise<User>;

export const createMockedAuthorizationHeaderMiddleWare =
    (authorizationHeaderTransform: AuthorizationHeaderTransform) => async (context: Koa.Context, next: Koa.Next) => {
        context.user = await authorizationHeaderTransform(context?.headers?.authorization ?? '');
        await next();
    };
