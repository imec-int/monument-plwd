import { LocationRepository } from './../repositories/LocationRepository';
import { ILocation } from './../models/Locations';
import { randomUUID } from 'crypto';
import { Log, LogEvent } from './../models/Log';
import { LogRepository } from './../repositories/LogRepository';
import Koa from 'koa';
import logger from '../utils/logger';
import { KompyLocation } from '../models/Kompy';

interface ILogController {
    logRepository: LogRepository;
    locationRepository: LocationRepository;
}

export class LogController {
    constructor(private props: ILogController) {}

    postKompyLocation = async (ctx: Koa.ParameterizedContext) => {
        const newLocation = ctx.request.body as KompyLocation;

        try {
            const logs = [mapKompyLocationToLog(newLocation)];
            await this.props.logRepository.insert(logs);

            const locations = logs.map(mapToLocation);
            await this.props.locationRepository.insert(locations);

            ctx.status = 200;
        } catch (error) {
            logger.error(`/location`, error);
            ctx.status = 500;
        }
    };

    postLog = async (ctx: Koa.ParameterizedContext) => {
        const body = ctx.request.body as { events: Log[] };

        try {
            await this.props.logRepository.insert(body.events);

            const locationLogs = body.events.filter((e) => e.type === LogEvent.LOCATION);

            // Return early in case there are no AndroidWear_Location events in the locationLogs array
            if (locationLogs.length > 0) {
                const locations = locationLogs.map(mapToLocation);
                await this.props.locationRepository.insert(locations);
            }

            ctx.status = 200;
            ctx.body = { success: true };
        } catch (error) {
            logger.error(`/log/report.json`, error);
            ctx.status = 500;
            ctx.body = { success: false };
        }
    };
}

export const mapToLocation = (log: Log) => {
    if (log.type === LogEvent.KOMPY_LOCATION) {
        const payload: KompyLocation = JSON.parse(log.payload);
        return {
            createdAt: new Date().toISOString(),
            id: randomUUID(),
            location: { lat: Number(payload.position.latitude), lng: Number(payload.position.longitude) },
            timestamp: log.timestamp,
            watchId: log.user,
        } as ILocation;
    }

    const payload = JSON.parse(log.payload);
    return {
        createdAt: new Date().toISOString(),
        id: randomUUID(),
        location: { lat: payload.latitude, lng: payload.longitude },
        timestamp: log.timestamp,
        watchId: log.user,
    } as ILocation;
};

export const mapKompyLocationToLog = (kompyLocation: KompyLocation): Log => ({
    payload: JSON.stringify(kompyLocation),
    timestamp: kompyLocation.timestamp,
    type: LogEvent.KOMPY_LOCATION,
    // This udid corresponds with the IMEI number linked to the watch
    user: kompyLocation.device.udid,
});
