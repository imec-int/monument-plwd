import { add, isAfter, isBefore } from 'date-fns';
import Koa from 'koa';
import { CalendarEventRepository } from 'src/repositories/CalendarEventRepository';
import { LocationRepository } from 'src/repositories/LocationRepository';
import { PlwdRepository } from 'src/repositories/PlwdRepository';
import { UserRepository } from 'src/repositories/UserRepository';
import { NotificationService } from 'src/services/NotificationService';
import logger from '../utils/logger';
import { ICoordinate } from 'src/models/Locations';

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

const MAX_DISTANCE_FROM_EVENT = 150; // in meters
const NOTIFICATION_TRIGGER_DELAY = 10; // in minutes

export class SimulationController {
    constructor(
        private readonly calendarEventRepository: CalendarEventRepository,
        private readonly plwdRepository: PlwdRepository,
        private readonly notificationService: NotificationService,
        private readonly locationRepository: LocationRepository,
        private readonly userRepository: UserRepository
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
            const notificationThresholdTime = add(start, { minutes: NOTIFICATION_TRIGGER_DELAY });
            // Set the current time to the time that was set in the SimulationPoint
            const now = new Date(time);

            if (!isAfter(now, notificationThresholdTime)) {
                logger.info(
                    `[simulate] - Event start time has not passed the allowed ${NOTIFICATION_TRIGGER_DELAY} minutes delay`,
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
                distance: MAX_DISTANCE_FROM_EVENT,
            });

            if (isWithinDistance) {
                logger.info(
                    `[handleLocations] - PLWD [${plwd.id}] is within ${MAX_DISTANCE_FROM_EVENT} meters from the event, nothing more to report.`,
                    { coordinateA, coordinateB }
                );
                ctx.status = 200;
                return;
            }

            logger.info(
                `[handleLocations] - PLWD [${plwd.id}] seems to be lost, sending notification to contact persons(s) and caretaker`
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
