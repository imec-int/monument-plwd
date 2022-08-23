import { ICarecircleMember } from './CarecircleMember';
import { IExternalContact } from './ExternalContact';
import { ICoordinate } from './Locations';

export type IAddress = {
    description?: string;
    // TODO: should check if this can never be null/undefined
    geometry?: {
        location: ICoordinate;
    };
};

export type CarecircleMemberId = string;

export type ExternalContactId = string;

export type CalendarEventBase = {
    address?: IAddress;
    createdBy: string;
    endTime: string;
    id: string;
    pickedUp: boolean;
    plwdId: string;
    repeat: string;
    startTime: string;
    title: string;
};

export interface CalendarEvent extends CalendarEventBase {
    carecircleMemberIds: CarecircleMemberId[];
    externalContactIds: ExternalContactId[];
}

export type CarecircleMember = {
    affiliation: string;
    email: string;
    firstName: string;
    id: string;
    lastName: string;
    permissions: string[];
    phone: string;
};

export interface CalendarEventWithContacts extends CalendarEventBase {
    carecircleMembers: ICarecircleMember[];
    externalContacts: IExternalContact[];
}
