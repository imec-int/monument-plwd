import { LogLevel } from './logger';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

const dotEnvConfig = dotenv.config();
dotenvExpand.expand(dotEnvConfig);

export type IConfig = ReturnType<typeof createConfiguration>;

export function createConfiguration() {
    const env = process.env;
    return {
        port: env.PORT || 8080,
        developmentMode: env.DEVELOPMENT_MODE === 'true',
        logLevel: (env.LOG_LEVEL || 'info') as LogLevel,
        db: {
            connectionString: env.POSTGRES_CONNECTION_STRING as string,
        },
        notification: {
            baseUrl: env.MONUMENT_ACTIVITY_BASE_URL as string,
            sendgrid: {
                apiKey: env.SENDGRID_API_KEY as string,
                enabled: env.SENDGRID_ENABLE === 'true',
                from: env.SENDGRID_FROM as string,
            },
            twilio: {
                whatsapp: {
                    enabled: env.TWILIO_WHATSAPP_ENABLE === 'true',
                    from: env.TWILIO_WHATSAPP_FROM as string,
                },
                sms: {
                    enabled: env.TWILIO_SMS_ENABLE === 'true',
                    from: env.TWILIO_SMS_FROM as string,
                },
                accountSid: env.TWILIO_ACCOUNT_SID as string,
                authToken: env.TWILIO_AUTH_TOKEN as string,
            },
        },
        auth0: {
            jwt: {
                audience: env.AUTH0_JWT_AUDIENCE as string,
                domain: env.AUTH0_JWT_DOMAIN as string,
            },
            m2m: {
                audience: env.AUTH0_M2M_AUDIENCE as string,
                baseUrl: env.AUTH0_M2M_BASE_URL as string,
                clientId: env.AUTH0_M2M_CLIENT_ID as string,
                clientSecret: env.AUTH0_M2M_CLIENT_SECRET as string,
                domain: env.AUTH0_M2M_DOMAIN as string,
                tokenUrl: env.AUTH0_M2M_TOKEN_URL as string,
            },
        },
        kompyClientAPI: {
            enabled: env.ENABLE_KOMPY_WATCH_CLIENT_API === 'true',
            authToken: `${env.KOMPY_AUTH_USER ?? ''}:${env.KOMPY_AUTH_PASSWORD ?? ''}` as string,
        },
    };
}
