import Koa, { Middleware } from 'koa';
import { addMinutes } from 'date-fns';
import logger from '../utils/logger';
import { LocationRepository } from './../repositories/LocationRepository';
import { PlwdRepository } from 'src/repositories/PlwdRepository';
import { CalendarEventRepository } from 'src/repositories/CalendarEventRepository';
import { formatDateWithoutSecondsAndMilliseconds } from '../utils/dateWithoutSecondsAndMilliseconds';
import { DefaultAuthorizationService } from '../auth/AuthorizationService';

export class LocationControllerAuthorizationService {
    constructor(private readonly authService: DefaultAuthorizationService) {}

    canAccessLocationsForPlwd: Middleware = async (ctx, next) => {
        const { user: requestingUser } = ctx;
        const { plwdId } = ctx.params;

        const isAuthorized = await this.authService.isAuthorizedForActionOnPlwdWithOngoingEvent(requestingUser, plwdId);
        if (isAuthorized.isUnauthorized()) {
            ctx.status = isAuthorized.status;
            ctx.body = isAuthorized.message;
            return;
        }

        await next();
    };
}

export class LocationController {
    constructor(
        private locationRepository: LocationRepository,
        private plwdRepository: PlwdRepository,
        private calendarEventRepository: CalendarEventRepository
    ) {}

    getLocationsByPlwdId = async (ctx: Koa.ParameterizedContext) => {
        const { plwdId } = ctx.params;

        try {
            const plwd = await this.plwdRepository.get(plwdId);

            if (!plwd) {
                ctx.status = 404;
                ctx.message = 'Not found';

                return;
            }

            const locations = await this.locationRepository.getByWatchId(plwd.watchId);
            ctx.status = 200;
            ctx.body = { success: true, data: locations };
        } catch (err) {
            logger.error('Failed to fetch locations by user id:', err);
            ctx.status = 500;
            ctx.body = { success: false };
        }
    };

    getPublicLocation = async (ctx: Koa.ParameterizedContext) => {
        const { eventId } = ctx.params;

        try {
            const event = await this.calendarEventRepository.getById(eventId);
            if (!event) {
                ctx.status = 404;
                ctx.message = 'Event not found';

                return;
            }

            const startTime = formatDateWithoutSecondsAndMilliseconds(new Date(event.startTime));
            const now = formatDateWithoutSecondsAndMilliseconds(new Date());
            const formattedEndTime = formatDateWithoutSecondsAndMilliseconds(new Date(event.endTime));
            const endTimePlus20Minutes = addMinutes(formattedEndTime, 20);

            if (now < startTime || now > endTimePlus20Minutes) {
                ctx.status = 403;
                ctx.message = `Event ${event.id} is not active`;

                return;
            }

            const plwd = await this.plwdRepository.get(event.plwdId);
            if (!plwd) {
                ctx.status = 404;
                ctx.message = 'Plwd not found';

                return;
            }

            const locations = await this.locationRepository.getPublicLocation(event, plwd.watchId);
            ctx.status = 200;
            ctx.body = { success: true, data: locations };
        } catch (err) {
            logger.error('Failed to fetch public location:', err);
            ctx.status = 500;
            ctx.body = { success: false };
        }
    };
}
