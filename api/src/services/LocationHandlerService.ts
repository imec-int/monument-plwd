import { LocationRepository } from '../repositories/LocationRepository';
import { PlwdRepository } from '../repositories/PlwdRepository';
import { ICoordinate, ILocation } from '../models/Locations';
import { CalendarEventRepository } from '../repositories/CalendarEventRepository';
import { CompositeNotificationService } from './NotificationService';
import { IConfig } from '../utils/config';
import isAfter from 'date-fns/isAfter';
import add from 'date-fns/add';
import logger from '../utils/logger';
import { CalendarEventWithContacts } from '../models/CalendarEvent';
import { sub } from 'date-fns';
import { IPlwd } from '../models/Plwd';

export class LocationHandlerService {
    constructor(
        private readonly calendarEventRepository: CalendarEventRepository,
        private readonly config: IConfig,
        private readonly locationRepository: LocationRepository,
        private readonly notificationService: CompositeNotificationService,
        private readonly plwdRepository: PlwdRepository
    ) {}

    async sendNotifications() {
        const now = new Date();
        const ongoingEvents = await this.calendarEventRepository.getOngoingEvents();

        if (ongoingEvents.length === 0) {
            logger.info(`[sendNotifications] - No ongoing events found at ${now.toISOString()}`);
        }

        for await (const ongoingEvent of ongoingEvents) {
            // Check if event has surpassed the 10 minutes mark since the start of the event
            const start = new Date(ongoingEvent.startTime);
            const notificationThresholdTime = add(start, { minutes: this.config.notification.triggerDelay });

            // 10 minutes have not yet passed, then we can exit early
            if (!isAfter(now, notificationThresholdTime)) {
                logger.info(
                    `[sendNotifications] - Event start time has not passed the allowed ${this.config.notification.triggerDelay} minutes delay`,
                    ongoingEvent
                );
                return;
            }

            const plwd = await this.plwdRepository.get(ongoingEvent.plwdId);

            if (!plwd) {
                logger.warn(`[sendNotifications] - Plwd "[${ongoingEvent.plwdId}]" not found!`);
                return;
            }

            // Fetch locations via plwd.watchId
            const maxTimestamp = sub(new Date(ongoingEvent.startTime), {
                minutes: this.config.notification.maxTimeBetweenLastLocationTimestampAndEventStart,
            });
            const locations = await this.locationRepository.getByWatchId(plwd.watchId, maxTimestamp);

            if (locations.length > 0) {
                await this.handleLocations(ongoingEvent, plwd, locations);
            }
        }
    }

    async handleLocations(ongoingEvent: CalendarEventWithContacts, plwd: IPlwd, locations: ILocation[]) {
        const [lastKnownLocation] = locations;
        const ongoingEventLocation = ongoingEvent?.address?.geometry?.location as ICoordinate;

        if (hasValidLocations(ongoingEventLocation, lastKnownLocation.location)) {
            const coordinateA = ongoingEventLocation;
            const coordinateB = lastKnownLocation.location;
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
                    `[handleLocations] - PLWD [${plwd.id}] seems to be lost, sending notification to contact persons(s) and/or caretaker`
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
                coordinateB: lastKnownLocation.location,
            });
            return;
        }
    }
}

const hasValidLocations = (eventLocation?: ICoordinate, userLocation?: ICoordinate) => {
    if (!eventLocation || !eventLocation.lat || !eventLocation.lng) return false;
    if (!userLocation || !userLocation.lat || !userLocation.lng) return false;
    return true;
};
