import { addHours, subMinutes } from 'date-fns';
import { CalendarEvent, IAddress } from 'src/models/CalendarEvent';
import { ICoordinate } from 'src/models/Locations';
import { eventCoordinates } from './locations';

enum RepeatEvent {
    DAILY = 'Daily',
    MONTHLY = 'Montly',
    WEEKLY = 'Weekly',
    YEARLY = 'Yearly',
}

export const formatToCalendarAddress = ({
    description,
    location,
}: {
    description: string;
    location: ICoordinate;
}): IAddress => ({
    description,
    geometry: { location },
});

export class CalendarEventBuilder {
    calendarEvent = {
        address: { description: 'Event location', geometry: { location: eventCoordinates } },
        carecircleMemberIds: [],
        createdBy: '',
        date: new Date().toISOString(),
        endTime: addHours(new Date(), 1).toISOString(),
        externalContactIds: [],
        id: '',
        pickedUp: false,
        plwdId: '',
        repeat: RepeatEvent.DAILY,
        startTime: subMinutes(new Date(), 5).toISOString(),
        title: 'Dummy event',
    } as CalendarEvent;

    constructor(params?: CalendarEvent) {
        if (params) {
            this.calendarEvent = { ...this.calendarEvent, ...params };
        }
    }

    withTitle(title: string) {
        this.calendarEvent = { ...this.calendarEvent, title };
        return this;
    }

    withRepeatEvent(repeat: RepeatEvent) {
        this.calendarEvent = { ...this.calendarEvent, repeat };
        return this;
    }

    withStartTime(startTime: string) {
        this.calendarEvent = { ...this.calendarEvent, startTime };
        return this;
    }

    withEndTime(endTime: string) {
        this.calendarEvent = { ...this.calendarEvent, endTime };
        return this;
    }

    withAddress(address?: IAddress) {
        this.calendarEvent = { ...this.calendarEvent, address };
        return this;
    }

    withPickedUp(pickedUp: boolean) {
        this.calendarEvent = { ...this.calendarEvent, pickedUp };
        return this;
    }

    withCarecircleContacts(carecircleMemberIds: string[]) {
        this.calendarEvent = { ...this.calendarEvent, carecircleMemberIds };
        return this;
    }

    withExternalContacts(externalContactIds: string[]) {
        this.calendarEvent = { ...this.calendarEvent, externalContactIds };
        return this;
    }

    withPLWD(plwdId: string) {
        this.calendarEvent = { ...this.calendarEvent, plwdId };
        return this;
    }

    withCreatedBy(userId: string) {
        this.calendarEvent = { ...this.calendarEvent, createdBy: userId };
        return this;
    }

    build() {
        return this.calendarEvent;
    }
}
