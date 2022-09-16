import Koa from 'koa';
import { authenticatedRoutes, kompyClientAPI, unauthenticatedRoutes } from './routes';
import cors from '@koa/cors';
import { initLogging } from './utils/logger';
import { createDb, migrateDatabase } from './db';
import createLogRepository from './repositories/LogRepository';
import createLocationRepository from './repositories/LocationRepository';
import createNotificationRepository from './repositories/NotificationRepository';
import bodyParser from 'koa-bodyparser';
import createCalendarEventRepository from './repositories/CalendarEventRepository';
import createUserRepository from './repositories/UserRepository';
import { createAuthorizationMiddleware } from './auth/authorization-middleware';
import createCarecircleMemberRepository from './repositories/CarecircleMemberRepository';
import { CompositeNotificationService } from './services/NotificationService';
import { createConfiguration } from './utils/config';
import createPlwdRepository from './repositories/PlwdRepository';
import createExternalContactsRepository from './repositories/ExternalContactsRepository';
import { RestApiBasedAuth0Service } from './services/RestApiBasedAuth0Service';
import { createKompyAuthorizationMiddleware } from './auth/kompy-authorization-middleware';
import createAffiliationRepository from './repositories/AffiliationRepository';
import { MailService } from './services/MailService';
import { SimulationController } from './controllers/SimulationController';
import { LocationHandlerService } from './services/LocationHandlerService';

(async () => {
    const config = createConfiguration();
    const app: Koa = new Koa();

    const logger = initLogging({
        prettify: config.developmentMode,
        logLevel: config.logLevel,
    });

    const db = createDb(config.db.connectionString, logger);
    await migrateDatabase(db);

    const logRepository = createLogRepository(db);
    const calendarEventRepository = createCalendarEventRepository(db);
    const locationRepository = createLocationRepository(db);
    const notificationRepository = createNotificationRepository(db);
    const userRepository = createUserRepository(db);
    const affiliationRepository = createAffiliationRepository(db);
    const carecircleMemberRepository = createCarecircleMemberRepository(db);
    const plwdRepository = createPlwdRepository(db);
    const externalContactRepository = createExternalContactsRepository(db);

    // Instantiate the notification service
    const notificationService = new CompositeNotificationService(notificationRepository, config)
        .withEmailService()
        .withTextMessageService()
        .withWhatsappMessageService();

    // Instantiate the LocationHandler service
    const locationHandlerService = new LocationHandlerService(
        calendarEventRepository,
        config,
        locationRepository,
        notificationService,
        plwdRepository
    );

    // Auth0
    const auth0Service = new RestApiBasedAuth0Service(config.auth0);

    // SendGrid
    const mailService = new MailService(config);

    const authorizationMiddleware = createAuthorizationMiddleware(config.auth0);
    const kompyAuthorizationMiddleware = createKompyAuthorizationMiddleware(config);
    const enabledKompyClientAPI = config.kompyClientAPI.enabled;
    const simulationController = new SimulationController(
        calendarEventRepository,
        plwdRepository,
        notificationService,
        locationRepository,
        config
    );

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
                locationHandlerService,
                locationRepository,
                logRepository,
                mailService,
                notificationRepository,
                notificationService,
                plwdRepository,
                simulationController,
                userRepository,
            })
        );

    if (enabledKompyClientAPI) {
        app.use(
            kompyClientAPI({
                kompyAuthorizationMiddleware,
                locationRepository,
                logRepository,
            })
        );
    }

    app.listen(config.port, () => {
        const env = config.developmentMode ? 'Development' : 'Production';
        const url = 'http://localhost:' + config.port.toString();
        logger.info('%s Server Started ∹ %s', env, url);
    });
})();
