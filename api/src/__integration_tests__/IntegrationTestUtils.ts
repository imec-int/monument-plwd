import { MockCompositeNotificationService } from './MockNotificationService';
import { initLogging } from '../utils/logger';
import { createDb, migrateDatabase } from '../db';
import { PostgisContainer } from './PostgisContainer';
import Koa from 'koa';
import createLogRepository from '../repositories/LogRepository';
import createCalendarEventRepository from '../repositories/CalendarEventRepository';
import createLocationRepository from '../repositories/LocationRepository';
import createUserRepository from '../repositories/UserRepository';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import { authenticatedRoutes, kompyClientAPI, unauthenticatedRoutes } from '../routes';
import { User } from '../models/User';
import { createMockedAuthorizationHeaderMiddleWare } from '../auth/mocked-authorization-middleware';
import createNotificationRepository from '../repositories/NotificationRepository';
import createCarecircleMemberRepository from '../repositories/CarecircleMemberRepository';
import { createConfiguration } from '../utils/config';
import createPlwdRepository from '../repositories/PlwdRepository';
import createExternalContactsRepository from '../repositories/ExternalContactsRepository';
import createAffiliationRepository from '../repositories/AffiliationRepository';
import { MockAuth0Service } from './MockAuth0Service';
import { createKompyAuthorizationMiddleware } from '../auth/kompy-authorization-middleware';
import { MockMailService } from './MockMailService';

interface AuthorizationHeaderTransform {
    tokenToUser: (token: string) => Promise<User>;
}

export class MockAuthorizationHeaderTransform implements AuthorizationHeaderTransform {
    private delegate: (token: string) => Promise<User>;

    tokenToUser(token: string): Promise<User> {
        return this.delegate(token);
    }

    loginAs = (id: string) => {
        const user = Promise.resolve(new User({ id }));
        this.delegate = () => {
            return Promise.resolve(user);
        };
        return user;
    };
}

export const initTestSetup = async () => {
    const config = createConfiguration();
    const container = await new PostgisContainer().start();
    const app: Koa = new Koa();

    const logger = initLogging({
        prettify: false,
        logLevel: 'warn',
    });

    const database = createDb(container.getConnectionString(), logger);
    await migrateDatabase(database);

    const logRepository = createLogRepository(database);
    const calendarEventRepository = createCalendarEventRepository(database);
    const locationRepository = createLocationRepository(database);
    const userRepository = createUserRepository(database);
    const affiliationRepository = createAffiliationRepository(database);
    const notificationRepository = createNotificationRepository(database);
    const carecircleMemberRepository = createCarecircleMemberRepository(database);
    const plwdRepository = createPlwdRepository(database);
    const externalContactRepository = createExternalContactsRepository(database);

    // Mock authorization logic
    const mockAuthorizationHeaderTransform = new MockAuthorizationHeaderTransform();
    const authorizationHeaderTransform = async (bearerToken: string) => {
        return mockAuthorizationHeaderTransform.tokenToUser(bearerToken);
    };
    const authorizationMiddleware = createMockedAuthorizationHeaderMiddleWare(authorizationHeaderTransform);
    const kompyAuthorizationMiddleware = createKompyAuthorizationMiddleware(config);

    const notificationService = new MockCompositeNotificationService(notificationRepository, config)
        .withEmailService()
        .withTextMessageService()
        .withWhatsappMessageService();

    const auth0Service = new MockAuth0Service();
    const mailService = new MockMailService(config);

    // Create the Koa app
    app.use(cors())
        .use(bodyParser())
        .use(unauthenticatedRoutes({ calendarEventRepository, locationRepository, plwdRepository }))
        .use(
            authenticatedRoutes({
                affiliationRepository,
                auth0Service,
                authorizationMiddleware,
                calendarEventRepository,
                carecircleMemberRepository,
                externalContactRepository,
                locationRepository,
                logRepository,
                notificationRepository,
                notificationService,
                mailService,
                plwdRepository,
                userRepository,
            })
        );

    app.use(
        kompyClientAPI({
            calendarEventRepository,
            kompyAuthorizationMiddleware,
            locationRepository,
            logRepository,
            notificationService,
            plwdRepository,
            userRepository,
        })
    );

    return {
        app,
        config,
        container,
        database,
        mockJwtHandler: mockAuthorizationHeaderTransform,
        repositories: {
            affiliationRepository,
            calendarEventRepository,
            carecircleMemberRepository,
            externalContactRepository,
            locationRepository,
            logRepository,
            notificationRepository,
            plwdRepository,
            userRepository,
        },
    };
};
