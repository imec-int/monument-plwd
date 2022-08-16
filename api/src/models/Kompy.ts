export type KompyDevice = {
    id: string;
    name: string;
    phoneNumber: string;
    udid: string;
};

export type KompyLocation = {
    description: string;
    device: KompyDevice;
    eventId: string;
    organisation: KompyOrganisation;
    position: KompyPosition;
    timestamp: string;
};

type KompyOrganisation = {
    id: string;
    name: string;
};

export type KompyPosition = {
    accuracy: string;
    address: string;
    latitude: string;
    longitude: string;
    timestamp: string;
};

type KompyInitiator = {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
};

type KompyResponder = {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
};

export enum KompyEventCategory {
    ALARM = 'alarm',
    GEOFENCE_ENTRY = 'geofence_entry',
    GEOFENCE_EXIT = 'geofence_exit',
    LOW_BATTERY = 'low_battery',
    NO_COMMUNICATION = 'no_communication',
    COMMUNICATION_RESTORED = 'communication_restored',
    OTHER = 'other',
}

export enum KompyEventStatus {
    ACCEPTED = 'accepted',
    CLOSED = 'closed',
    HANDLED = 'handled',
    OPEN = 'open',
}

export type KompyEvent = {
    category: KompyEventCategory;
    description: string;
    device: KompyDevice;
    id: string;
    initiator: KompyInitiator;
    organisation: KompyOrganisation;
    position: KompyPosition;
    responser: KompyResponder;
    status: KompyEventStatus;
    timestamp: string;
    type: string;
};
