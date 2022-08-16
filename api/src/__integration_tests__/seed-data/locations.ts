import { ICoordinate } from 'src/models/Locations';

export const eventCoordinates = { lat: 51.2078885, lng: 3.2222007 } as ICoordinate;
export const userWithinGeofenceCoordinates = { lat: 51.206813, lng: 3.22101 } as ICoordinate;
export const userOutsideGeofenceCoordinate = { lat: 51.2067785, lng: 3.2207641 } as ICoordinate;
// See: https://www.wolframalpha.com/input?i=51.2078885N+3.2222007W+to+51.206813N+3.2209063W+in+km
export const userAt150mDistance = { lat: 51.206813, lng: 3.2209063 } as ICoordinate;
// See: https://www.wolframalpha.com/input?i=51.2078885N+3.2222007W+to+51.206813N+3.2209060W+in+km
export const userJustOver150mDistance = { lat: 51.206813, lng: 3.220906 } as ICoordinate;
