export enum LogEvent {
    LOCATION = 'AndroidWear_Location',
    STEPS = 'AndroidWear_Steps',
    LIGHT = 'Light',
    HEART_RATE = 'AndroidWear_HeartRate',
    KOMPY_LOCATION = 'KompyLocation',
}

export type Log = {
    type: LogEvent;
    user: string;
    timestamp: string;
    payload: any;
};

export type ILog = Log & {
    id: string;
};
