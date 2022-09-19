import { randomUUID } from 'crypto';
import { Knex } from 'knex';
import logger from '../utils/logger';
import { ICoordinate, ILocation } from '../models/Locations';
import { formatDateWithoutSecondsAndMilliseconds } from '../utils/dateWithoutSecondsAndMilliseconds';
import { addMinutes, subMinutes } from 'date-fns';
import { CalendarEventWithContacts } from '../models/CalendarEvent';

type isWithinDistanceFunction = {
    coordinateA: ICoordinate;
    coordinateB: ICoordinate;
    distance: number;
};

const table = 'locations';

export interface LocationRepository {
    deleteById(id: string): Promise<void>;
    get(): Promise<ILocation[]>;
    getByWatchId(watchId: string, maxTimestamp?: Date): Promise<ILocation[]>;
    getPublicLocation(event: CalendarEventWithContacts, watchId: string): Promise<ILocation[]>;
    insert(locationsEvents: ILocation[]): Promise<void>;
    isWithinDistance({ coordinateA, coordinateB, distance }: isWithinDistanceFunction): Promise<boolean>;
}

export const mapToViewModel = (data: any): ILocation => {
    const location = JSON.parse(data.location);
    return {
        createdAt: new Date(data.createdAt).toISOString(),
        id: data.id,
        location: { lng: location.coordinates[0], lat: location.coordinates[1] },
        timestamp: new Date(data.timestamp).toISOString(),
        watchId: data.watchId,
    };
};

const getByWatchId = (knex: Knex) => {
    return async (watchId: string, maxTimestamp: Date | undefined) => {
        const message = `Fetching locations for plwd with watchId [${watchId}]`;
        const profiler = logger.startTimer();
        const query = knex(table)
            .select(
                'created_at AS createdAt',
                'id',
                'timestamp',
                'watch_id AS watchId',
                knex.raw('ST_AsGeoJSON(location) AS location')
            )
            .where('watch_id', watchId)
            .orderBy('timestamp', 'desc');

        if (maxTimestamp) {
            query.where('timestamp', '>=', maxTimestamp);
        }

        const result = await query;
        profiler.done({ message });
        return result.map(mapToViewModel);
    };
};

const getPublicLocation = (knex: Knex) => {
    return async (event: CalendarEventWithContacts, watchId: string) => {
        const message = `Fetching public location for user for event ${event.id}`;
        const profiler = logger.startTimer();

        const startTime = formatDateWithoutSecondsAndMilliseconds(new Date(event.startTime));
        const formattedEndTime = formatDateWithoutSecondsAndMilliseconds(new Date(event.endTime));

        // Remove 30 minutes from startTime
        const startTimeMinus30Minutes = subMinutes(startTime, 30);
        // Add 30 minutes to endTime
        const endTimePlus30Minutes = addMinutes(formattedEndTime, 30);

        // Fetch location by watchId between 30 minutes before startTime and 30 minutes after endTime of event
        let result = await knex(table)
            .select(
                'created_at AS createdAt',
                'id',
                'timestamp',
                'watch_id AS watchId',
                knex.raw('ST_AsGeoJSON(location) AS location')
            )
            .where('watch_id', watchId)
            .whereBetween('timestamp', [startTimeMinus30Minutes, endTimePlus30Minutes])
            .orderBy('timestamp', 'desc');

        // From the result condense the result to get time events from every 10 minutes
        result = result.reduce((acc, curr) => {
            const { timestamp, id, location, watchId, createdAt } = curr;
            const time = new Date(timestamp).getTime();
            const timeKey = Math.floor(time / 1000 / 60 / 10) * 10 * 1000 * 60;
            if (!acc[timeKey]) {
                acc[timeKey] = {
                    id,
                    timestamp: new Date(timeKey).toISOString(),
                    location,
                    watchId,
                    createdAt,
                };
            }
            return acc;
        }, {});
        // Convert the result to an array
        result = Object.values(result);

        if (result.length === 0) {
            const lastLocation = await knex(table)
                .first(
                    'created_at AS createdAt',
                    'id',
                    'timestamp',
                    'watch_id AS watchId',
                    knex.raw('ST_AsGeoJSON(location) AS location')
                )
                .where('watch_id', watchId)
                .orderBy('timestamp', 'desc');

            result = lastLocation ? [lastLocation] : [];
        }

        profiler.done({ message });
        return result.map(mapToViewModel);
    };
};

const insert = (knex: Knex) => {
    return async (locations: ILocation[]) => {
        const message = `Insert locations`;
        const profiler = logger.startTimer();
        for await (const location of locations) {
            const formatGeometryToPoint = `Point(${location.location.lng} ${location.location.lat})`;
            await knex.raw(
                `
                INSERT INTO locations (watch_id, timestamp, location, created_at)
                VALUES (?, ?, ST_GeomFromText(?), ?);
                `,
                [location.watchId, location.timestamp, formatGeometryToPoint, location.createdAt]
            );
        }
        profiler.done({ message });
    };
};

// See: https://postgis.net/docs/ST_DWithin.html
// Calculates if two points are within a specified distance of each other.
const isWithinDistance = (knex: Knex) => {
    return async ({ coordinateA, coordinateB, distance }: isWithinDistanceFunction) => {
        const tempTableName = `postgis_calc_${randomUUID()}`;
        const result = await knex.transaction(async (trx) => {
            // See: https://www.postgresql.org/docs/current/sql-createtable.html (ON COMMIT section)
            await trx.raw(`
                CREATE TEMPORARY TABLE "${tempTableName}" (
                    point_a geography(Point,4326),
                    point_b geography(Point,4326),
                    distance INT
                ) ON COMMIT DROP;
            `);

            await trx.raw(
                `
                INSERT INTO "${tempTableName}" (point_a, point_b, distance)
                VALUES (
                    ST_GeomFromText(format('Point(%s %s)', ?::numeric, ?::numeric)),
                    ST_GeomFromText(format('Point(%s %s)', ?::numeric, ?::numeric)),
                    ?
                )
            `,
                [coordinateA.lng, coordinateA.lat, coordinateB.lng, coordinateB.lat, distance]
            );

            const check = await trx.raw(`
                SELECT point_a, point_b, distance
                FROM "${tempTableName}"
                WHERE ST_DWithin(point_a, point_b, distance)
                LIMIT 1;
            `);

            return check;
        });

        return result.rowCount > 0;
    };
};

const deleteById = (knex: Knex) => {
    return async (id: string) => {
        await knex(table).del().where({ id });
    };
};

const get = (knex: Knex) => {
    return async () => {
        const results = await knex(table).select(
            'created_at AS createdAt',
            'id',
            'timestamp',
            'watch_id AS watchId',
            knex.raw('ST_AsGeoJSON(location) AS location')
        );
        return results.map(mapToViewModel);
    };
};

const createLocationRepository = (knex: Knex) => {
    return {
        deleteById: deleteById(knex),
        get: get(knex),
        getByWatchId: getByWatchId(knex),
        getPublicLocation: getPublicLocation(knex),
        insert: insert(knex),
        isWithinDistance: isWithinDistance(knex),
    } as LocationRepository;
};

export default createLocationRepository;
