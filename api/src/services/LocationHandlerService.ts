import { LocationRepository } from '../repositories/LocationRepository';
import { PlwdRepository } from '../repositories/PlwdRepository';
import { ICoordinate, ILocation } from '../models/Locations';
import { CalendarEventRepository } from '../repositories/CalendarEventRepository';
import { CompositeNotificationService } from './NotificationService';
import { IConfig } from '../utils/config';
import isAfter from 'date-fns/isAfter';
import add from 'date-fns/add';
import logger from '../utils/logger';

export class LocationHandlerService {
    constructor(
        private readonly calendarEventRepository: CalendarEventRepository,
        private readonly config: IConfig,
        private readonly locationRepository: LocationRepository,
        private readonly notificationService: CompositeNotificationService,
        private readonly plwdRepository: PlwdRepository
    ) {}

    async handleLocations(locations: ILocation[]) {
        // Take last location (note: locations.at(-1) fails because of ts-jest...)
        const lastLocation = locations[locations.length - 1] as ILocation;

        const watchId = lastLocation.watchId;
        if (!watchId) {
            logger.error('[handleLocations] - No watchId specified for the current location...', { lastLocation });
            return;
        }

        const plwd = await this.plwdRepository.getByWatchId(watchId);
        if (!plwd) {
            logger.error(`[handleLocations] - PLWD not found for watchId [${watchId}]`);
            return;
        }

        // Fetch current calendar events for a plwd by plwdId, normally there should only be one
        // but let's handle the case where there are multiple at once as well...
        const ongoingEvents = await this.calendarEventRepository.getOngoingEventsByPlwdId(plwd.id);
        if (ongoingEvents.length === 0) {
            logger.info(`[handleLocations] - PLWD [${plwd.id}] does not have any ongoing events`);
            return;
        }

        for await (const ongoingEvent of ongoingEvents) {
            // Check if event has surpassed the 10 minutes mark since the start of the event
            const start = new Date(ongoingEvent.startTime);
            const notificationThresholdTime = add(start, { minutes: this.config.notification.triggerDelay });
            const now = new Date();

            // 10 minutes have not yet passed, then we can exit early
            if (!isAfter(now, notificationThresholdTime)) {
                logger.info(
                    `[handleLocations] - Event start time has not passed the allowed ${this.config.notification.triggerDelay} minutes delay`,
                    ongoingEvent
                );
                return;
            }

            // plwd is late, verify his location...
            const ongoingEventLocation = ongoingEvent?.address?.geometry?.location as ICoordinate;
            if (hasValidLocations(ongoingEventLocation, lastLocation.location)) {
                const coordinateA = ongoingEventLocation;
                const coordinateB = lastLocation.location;
                // Check if users's last sent position is within X amount of meters distance of event location
                // using fancy POSTGIS SQL statement
                const isWithinDistance = await this.locationRepository.isWithinDistance({
                    coordinateA,
                    coordinateB,
                    distance: this.config.notification.geofenceRadius,
                });

                if (isWithinDistance) {
                    logger.info(
                        `[handleLocations] - PLWD [${plwd.id}] is within ${this.config.notification.geofenceRadius} meters from the event, nothing more to report.`,
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
                    await this.notificationService.notifyForEvent({
                        event: ongoingEvent,
                        location: coordinateB,
                        plwd,
                        recipients,
                    });
                }
            } else {
                logger.error(`[handleLocations] - geometry data is invalid`, {
                    coordinateA: ongoingEvent?.address?.geometry,
                    coordinateB: lastLocation.location,
                });
                return;
            }
        }
    }
}

const hasValidLocations = (eventLocation?: ICoordinate, userLocation?: ICoordinate) => {
    if (!eventLocation || !eventLocation.lat || !eventLocation.lng) return false;
    if (!userLocation || !userLocation.lat || !userLocation.lng) return false;
    return true;
};
