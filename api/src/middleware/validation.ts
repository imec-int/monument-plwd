import * as yup from 'yup';
import Koa from 'koa';
import logger from '../utils/logger';

export const validateRequest = (schema: yup.AnySchema) => async (ctx: Koa.Context, next: Koa.Next) => {
    try {
        await schema.validate({
            body: ctx.request.body,
            params: ctx.params,
            user: ctx.user,
        });

        await next();
    } catch (error) {
        logger.error('ValidationMiddleware', { error, body: ctx.request.body });

        ctx.status = 400;
        ctx.message = 'Bad Request';

        return;
    }
};
