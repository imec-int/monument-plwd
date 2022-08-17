import { CalendarEventRepository } from 'src/repositories/CalendarEventRepository';
import { LocationRepository } from 'src/repositories/LocationRepository';
import { UserRepository } from 'src/repositories/UserRepository';
import isAfter from 'date-fns/isAfter';
import add from 'date-fns/add';
import logger from '../utils/logger'; // fixme: change import via tsconfig
import { ICoordinate, ILocation } from 'src/models/Locations';
import { CompositeNotificationService } from './NotificationService';
import { PlwdRepository } from 'src/repositories/PlwdRepository';

const MAX_DISTANCE_FROM_EVENT = 150; // in meters
const NOTIFICATION_TRIGGER_DELAY = 10; // in minutes

type handleLocationInterface = {
    calendarEventRepository: CalendarEventRepository;
    locations: ILocation[];
    locationRepository: LocationRepository;
    notificationService: CompositeNotificationService;
    plwdRepository: PlwdRepository;
    userRepository: UserRepository;
};

const hasValidLocations = (eventLocation: ICoordinate | undefined, userLocation: ICoordinate | undefined) => {
    if (!eventLocation || !eventLocation.lat || !eventLocation.lng) return false;
    if (!userLocation || !userLocation.lat || !userLocation.lng) return false;
    return true;
};

export const handleLocations = async ({
    calendarEventRepository,
    locationRepository,
    locations,
    notificationService,
    plwdRepository,
}: handleLocationInterface) => {
    // Take last location (note: locations.at(-1) fails because of ts-jest...)
    const lastLocation = locations[locations.length - 1] as ILocation;

    const watchId = lastLocation.watchId;
    if (!watchId) {
        logger.error('[handleLocations] - No watchId specified for the current location...', { lastLocation });
        return;
    }

    const plwd = await plwdRepository.getByWatchId(watchId);
    if (!plwd) {
        logger.error(`[handleLocations] - PLWD not found for watchId [${watchId}]`);
        return;
    }

    // Fetch current calendar events for user by user ID, normally there should only be one
    // but let's handle the case where there are multiple at once as well...
    const ongoingEventsUser = await calendarEventRepository.getOngoingEventsByPlwdId(plwd.id);
    if (ongoingEventsUser.length === 0) {
        logger.info(`[handleLocations] - PLWD [${plwd.id}] does not have any ongoing events`);
        return;
    }

    for await (const ongoingEvent of ongoingEventsUser) {
        // Check if event has surpassed the 10 minutes mark since the start of the event
        const start = new Date(ongoingEvent.startTime);
        const notificationThresholdTime = add(start, { minutes: NOTIFICATION_TRIGGER_DELAY });
        const now = new Date();

        // 10 minutes have not yet passed, then we can exit early
        if (!isAfter(now, notificationThresholdTime)) {
            logger.info(
                `[handleLocations] - Event start time has not passed the allowed ${NOTIFICATION_TRIGGER_DELAY} minutes delay`,
                ongoingEvent
            );
            return;
        }

        // PLWD is late, verify his location...
        if (hasValidLocations(ongoingEvent.address.geometry?.location, lastLocation.location)) {
            const coordinateA = ongoingEvent.address.geometry?.location as ICoordinate;
            const coordinateB = lastLocation.location as ICoordinate;
            // Check if users's last sent position is within X amount of meters distance of event location
            // using fancy POSTGIS SQL statement
            const isWithinDistance = await locationRepository.isWithinDistance({
                coordinateA,
                coordinateB,
                distance: MAX_DISTANCE_FROM_EVENT,
            });

            if (isWithinDistance) {
                logger.info(
                    `[handleLocations] - PLWD [${plwd.id}] is within ${MAX_DISTANCE_FROM_EVENT} meters from the event, nothing more to report.`,
                    { coordinateA, coordinateB }
                );
                return;
            } else {
                logger.info(
                    `[handleLocations] - PLWD [${plwd.id}] seems to be lost, sending notification to contact persons(s) and caretaker`
                );

                const { externalContacts, carecircleMembers } = ongoingEvent;

                const recipients = [...externalContacts, ...carecircleMembers];

                // Send notification to the contact and caretaker
                await notificationService.notifyForEvent({ plwd, recipients, event: ongoingEvent });
            }
        } else {
            logger.error(`[handleLocations] - geometry data is invalid`, {
                coordinateA: ongoingEvent.address.geometry,
                coordinateB: lastLocation.location,
            });
            return;
        }
    }
};
