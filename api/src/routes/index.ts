import { AffiliationRepository } from './../repositories/AffiliationRepository';
import {
    AffiliationController,
    AffiliationControllerAuthorizationService,
    createAffiliationValidationSchema,
} from './../controllers/AffiliationController';
import { LogController } from './../controllers/LogController';
import Router from 'koa-router';
import Koa from 'koa';
import { LogRepository } from '../repositories/LogRepository';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { LocationRepository } from '../repositories/LocationRepository';
import { UserRepository } from '../repositories/UserRepository';
import { CalendarEventRepository } from '../repositories/CalendarEventRepository';
import logger from '../utils/logger';
import { CompositeNotificationService } from '../services/NotificationService';
import { CarecircleMemberRepository } from 'src/repositories/CarecircleMemberRepository';
import { PlwdRepository } from 'src/repositories/PlwdRepository';
import { ExternalContactsRepository } from 'src/repositories/ExternalContactsRepository';
import {
    UserAuthorizationService,
    UserController,
    createUserValidationSchema,
    updateUserValidationSchema,
} from './../controllers/UserController';
import { SimulationController } from '../controllers/SimulationController';
import {
    PlwdAuthorizationService,
    PlwdController,
    getPlwdValidationSchema,
    createPlwdValidationSchema,
    updatePlwdValidationSchema,
} from '../controllers/PlwdController';
import {
    CarecircleMemberAuthorizationService,
    CarecircleMemberController,
    createCarecircleMemberValidationSchema,
} from '../controllers/CarecircleMemberController';
import {
    CalendarEventAuthorizationService,
    CalendarEventController,
    createCalendarEventValidationSchema,
} from '../controllers/CalendarEventController';
import {
    ExternalContactController,
    ExternalContactControllerAuthorizationService,
    createExternalContactValidationSchema,
} from '../controllers/ExternalContactController';
import { LocationController, LocationControllerAuthorizationService } from '../controllers/LocationController';
import { DefaultAuthorizationService } from '../auth/AuthorizationService';
import { Auth0Service } from '../services/RestApiBasedAuth0Service';
import { KompyEvent } from '../models/Kompy';
import { validateRequest } from '../middleware/validation';
import { MailService, MailServiceInterface } from '../services/MailService';

export const unauthenticatedRoutes = ({
    calendarEventRepository,
    locationRepository,
    plwdRepository,
}: {
    calendarEventRepository: CalendarEventRepository;
    locationRepository: LocationRepository;
    plwdRepository: PlwdRepository;
}) => {
    const router = new Router();

    /**
     * Basic public routes
     */
    router.get('/', (ctx) => {
        ctx.redirect('/health');
    });

    router.get('/health', (context: Koa.ParameterizedContext) => {
        context.response.status = 200;
        context.response.body = { status: 'OK', user: context.user };
    });

    /**
     * Public Locations
     */
    const locationController = new LocationController(locationRepository, plwdRepository, calendarEventRepository);
    router.get('/public-location/:eventId', locationController.getPublicLocation);

    return router.routes();
};

export const kompyClientAPI = ({
    calendarEventRepository,
    kompyAuthorizationMiddleware,
    locationRepository,
    logRepository,
    notificationService,
    plwdRepository,
    userRepository,
}: {
    calendarEventRepository: CalendarEventRepository;
    kompyAuthorizationMiddleware: Koa.Middleware;
    locationRepository: LocationRepository;
    logRepository: LogRepository;
    notificationService: CompositeNotificationService;
    plwdRepository: PlwdRepository;
    userRepository: UserRepository;
}) => {
    const router = new Router();

    router.use(kompyAuthorizationMiddleware);

    /**
     * Kompy client API
     */
    router.post('/event', async (ctx: Koa.ParameterizedContext) => {
        const newKompyEvent = ctx.request.body as KompyEvent;

        logger.info('newKompyEvent', { newKompyEvent });

        ctx.status = 200;
    });

    router.put('/event', async (ctx: Koa.ParameterizedContext) => {
        const updatedKompyEvent = ctx.request.body as KompyEvent;

        logger.info('updatedKompyEvent', { updatedKompyEvent });

        ctx.status = 200;
    });

    const logController = new LogController({
        calendarEventRepository,
        plwdRepository,
        notificationService,
        locationRepository,
        userRepository,
        logRepository,
    });
    router.post('/location', logController.postKompyLocation);

    return router.routes();
};

export const authenticatedRoutes = ({
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
    affiliationRepository,
}: {
    affiliationRepository: AffiliationRepository;
    auth0Service: Auth0Service;
    authorizationMiddleware: Koa.Middleware;
    calendarEventRepository: CalendarEventRepository;
    carecircleMemberRepository: CarecircleMemberRepository;
    externalContactRepository: ExternalContactsRepository;
    locationRepository: LocationRepository;
    logRepository: LogRepository;
    notificationRepository: NotificationRepository;
    notificationService: CompositeNotificationService;
    mailService: MailServiceInterface;
    plwdRepository: PlwdRepository;
    userRepository: UserRepository;
}) => {
    /**
     * Configuration of the router
     */
    const router = new Router();

    router.use(authorizationMiddleware);

    router.use(async (ctx, next) => {
        await next();
        const rt = ctx.response.get('X-Response-Time');
        logger.info(`${ctx.method} ${ctx.url} [${ctx.status}] - ${rt}`);
    });

    router.use(async (ctx, next) => {
        const start = Date.now();
        await next();
        const ms = Date.now() - start;
        ctx.set('X-Response-Time', `${ms}ms`);
    });

    const authService = new DefaultAuthorizationService(
        userRepository,
        plwdRepository,
        carecircleMemberRepository,
        calendarEventRepository
    );

    /**
     * Affiliations
     */
    const affiliationAuthorizationService = new AffiliationControllerAuthorizationService(authService);
    const affiliationController = new AffiliationController(affiliationRepository);
    router.get(
        '/affiliations/:plwdId',
        affiliationAuthorizationService.canAccessAffiliationsForPlwd,
        affiliationController.getAffiliationsByPlwdId
    );
    router.post(
        '/affiliation/:plwdId',
        validateRequest(createAffiliationValidationSchema),
        affiliationAuthorizationService.canManageAffiliationsForPlwd,
        affiliationController.createAffiliation
    );

    /**
     * Users
     */
    const userAuthorizationService = new UserAuthorizationService(authService);
    const userController = new UserController(plwdRepository, userRepository, carecircleMemberRepository, auth0Service);
    router.get('/users/me', userController.getMe);
    router.get('/user/:auth0Id', userAuthorizationService.isAuthorizedToAccessUser, userController.getByAuth0Id);
    router.post('/user', validateRequest(createUserValidationSchema), userController.create);
    router.patch(
        '/user/:id',
        validateRequest(updateUserValidationSchema),
        userAuthorizationService.canUpdateUser,
        userController.update
    );
    router.delete('/user/:id', userAuthorizationService.isAuthorizedAsAdmin, userController.deleteUser);

    /**
     * External contacts
     */
    const externalContactAuthorizationService = new ExternalContactControllerAuthorizationService(authService);
    const externalContactController = new ExternalContactController(externalContactRepository);
    router.get(
        '/external-contacts/:plwdId',
        externalContactAuthorizationService.canAccessExternalContactsForPlwd,
        externalContactController.getExternalContactsByPlwdId
    );
    router.post(
        '/external-contact/:plwdId',
        validateRequest(createExternalContactValidationSchema),
        externalContactAuthorizationService.canManageExternalContactsForPlwd,
        externalContactController.createExternalContact
    );

    /**
     * Carecircle members
     */
    const carecircleMemberAuthorizationService = new CarecircleMemberAuthorizationService(authService);
    const carecircleMemberController = new CarecircleMemberController(
        carecircleMemberRepository,
        userRepository,
        plwdRepository,
        auth0Service,
        mailService
    );
    router.get(
        '/carecircle-members/:plwdId',
        carecircleMemberAuthorizationService.canAccessCarecircle,
        carecircleMemberController.getByPlwdId
    );
    router.post(
        '/carecircle-member/:plwdId',
        validateRequest(createCarecircleMemberValidationSchema),
        carecircleMemberAuthorizationService.canManageCarecircle,
        carecircleMemberController.create
    );
    router.patch(
        '/carecircle-member/:plwdId/:id',
        validateRequest(createCarecircleMemberValidationSchema),
        carecircleMemberAuthorizationService.canManageCarecircle,
        carecircleMemberController.update
    );
    router.delete(
        '/carecircle-member/:plwdId/:id',
        carecircleMemberAuthorizationService.canManageCarecircle,
        carecircleMemberController.delete
    );

    /**
     * PLWD
     */
    const plwdAuthorizationService = new PlwdAuthorizationService(authService);
    const plwdController = new PlwdController(plwdRepository, userRepository, carecircleMemberRepository);
    router.get(
        '/plwd/:plwdId',
        validateRequest(getPlwdValidationSchema),
        plwdAuthorizationService.isAuthorizedForViewingPlwd,
        plwdController.getPlwdById
    );
    router.post(
        '/plwd',
        validateRequest(createPlwdValidationSchema),
        plwdAuthorizationService.isAuthorizedForCreatingPlwd,
        plwdController.createPlwd
    );
    router.patch(
        '/plwd/:plwdId',
        validateRequest(updatePlwdValidationSchema),
        plwdAuthorizationService.isAuthorizedForManagingPlwd,
        plwdController.updatePlwd
    );

    /**
     * Locations
     */
    const locationAuthorizationService = new LocationControllerAuthorizationService(authService);
    const locationController = new LocationController(locationRepository, plwdRepository, calendarEventRepository);
    router.get(
        '/locations/:plwdId',
        locationAuthorizationService.canAccessLocationsForPlwd,
        locationController.getLocationsByPlwdId
    );

    /**
     * Calendar events
     */
    const calendarEventAuthorizationService = new CalendarEventAuthorizationService(authService);
    const calendarEventController = new CalendarEventController(calendarEventRepository, notificationRepository);
    router.get(
        '/calendar-events/:plwdId',
        calendarEventAuthorizationService.canAccessCalendar,
        calendarEventController.getCalendarEventsForPlwd
    );
    router.post(
        '/calendar-event/:plwdId',
        validateRequest(createCalendarEventValidationSchema),
        calendarEventAuthorizationService.canManageCalendar,
        calendarEventController.postCalendarEvent
    );
    router.patch(
        '/calendar-event/:plwdId',
        validateRequest(createCalendarEventValidationSchema),
        calendarEventAuthorizationService.canManageCalendar,
        calendarEventController.patchCalendarEvent
    );
    router.delete(
        '/calendar-event/:plwdId/:eventId',
        calendarEventAuthorizationService.canManageCalendar,
        calendarEventController.delete
    );

    /**
     * Simulation
     */
    const simulationController = new SimulationController(
        calendarEventRepository,
        plwdRepository,
        notificationService,
        locationRepository,
        userRepository
    );
    router.post('/simulation', simulationController.simulate);

    /**
     * Logs
     */
    const logController = new LogController({
        calendarEventRepository,
        plwdRepository,
        notificationService,
        locationRepository,
        userRepository,
        logRepository,
    });
    router.post('/log/report.json', logController.postLog);

    return router.routes();
};
