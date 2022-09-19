import { add, isAfter, isBefore } from 'date-fns';
import Koa from 'koa';
import { CalendarEventRepository } from 'src/repositories/CalendarEventRepository';
import { LocationRepository } from 'src/repositories/LocationRepository';
import { PlwdRepository } from 'src/repositories/PlwdRepository';
import { NotificationService } from 'src/services/NotificationService';
import logger from '../utils/logger';
import { ICoordinate } from 'src/models/Locations';
import { IConfig } from '../utils/config';

type SimulationPoint = {
    location: {
        address: string;
        lat: number;
        lng: number;
    };
    time: string;
};

type RequestBody = {
    selectedEventId: string;
    point: SimulationPoint;
};

export class SimulationController {
    constructor(
        private readonly calendarEventRepository: CalendarEventRepository,
        private readonly plwdRepository: PlwdRepository,
        private readonly notificationService: NotificationService,
        private readonly locationRepository: LocationRepository,
        private readonly config: IConfig
    ) {}

    simulate = async (ctx: Koa.ParameterizedContext) => {
        const body = ctx.request.body as RequestBody;

        try {
            logger.debug('Simulate journey point', body);

            if (!isValidSimulationBody(body)) {
                ctx.status = 400;
                logger.warn('Invalid body %s', body);
                return;
            }

            const {
                selectedEventId,
                point: { location, time },
            } = body;

            // Get CalendarEvent and PLWD connected to the CalendarEvent
            const calendarEvent = await this.calendarEventRepository.getById(selectedEventId);
            if (!calendarEvent) {
                throw new Error('[simulate] - Invalid event ID provided.');
            }

            const plwd = await this.plwdRepository.get(calendarEvent.plwdId);
            if (!plwd) {
                throw new Error('[simulate] - PLWD not found for CalendarEvent');
            }

            const start = new Date(calendarEvent.startTime);
            const end = new Date(calendarEvent.endTime);
            const notificationThresholdTime = add(start, { minutes: this.config.notification.triggerDelay });
            // Set the current time to the time that was set in the SimulationPoint
            const now = new Date(time);

            if (!isAfter(now, notificationThresholdTime)) {
                logger.info(
                    `[simulate] - Event start time has not passed the allowed ${this.config.notification.triggerDelay} minutes delay`,
                    calendarEvent
                );
                ctx.status = 200;
                return;
            }

            if (!isBefore(now, end)) {
                logger.info(`[simulate] - Event has already ended.`, calendarEvent);
                ctx.status = 200;
                return;
            }

            const calendarEventLocation = calendarEvent?.address?.geometry?.location as ICoordinate;
            const currentLocation = location as ICoordinate;
            if (!calendarEventLocation || !currentLocation) {
                logger.error(`[simulate] - geometry data is invalid`, {
                    coordinateA: calendarEventLocation,
                    coordinateB: currentLocation,
                });
                ctx.status = 200;
                return;
            }

            // Provided location is used as the simulated user's 'current' location
            const coordinateA = calendarEventLocation;
            const coordinateB = currentLocation;

            const isWithinDistance = await this.locationRepository.isWithinDistance({
                coordinateA,
                coordinateB,
                distance: this.config.notification.geofenceRadius,
            });

            if (isWithinDistance) {
                logger.info(
                    `[simulate] - PLWD [${plwd.id}] is within ${this.config.notification.geofenceRadius} meters from the event, nothing more to report.`,
                    { coordinateA, coordinateB }
                );
                ctx.status = 200;
                return;
            }

            logger.info(
                `[simulate] - PLWD [${plwd.id}] seems to be lost, sending notification to contact persons(s) and caretaker`
            );
            const { externalContacts, carecircleMembers } = calendarEvent;

            const recipients = [...externalContacts, ...carecircleMembers];

            // Send notification
            await this.notificationService.notifyForEvent({
                allowResend: true,
                event: calendarEvent,
                location: coordinateB,
                plwd,
                recipients,
            });

            ctx.status = 200;
            ctx.body = { success: true };
        } catch (error) {
            logger.error('/simulation', error);
            ctx.status = 500;
            ctx.body = { success: false };
        }
    };
}

export const isValidSimulationBody = (body: RequestBody) => {
    if (!body.selectedEventId) return false;

    const { point } = body;

    if (!point) return false;
    if (!point.location || !point.location.address || !point.location.lat || !point.location.lng) return false;
    if (!point.time) return false;

    if (typeof point.location.lat !== 'number' || typeof point.location.lng !== 'number') {
        return false;
    }

    return true;
};
