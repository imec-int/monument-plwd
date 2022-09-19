import circle from '@turf/circle';
import { Units } from '@turf/helpers';
import { Layer, Source } from 'react-map-gl';

const CircleUnitOption: Units = 'meters';

interface IMapGeofence {
  coordinates: [number, number];
}

export const MapGeofence: React.FC<IMapGeofence> = ({ coordinates }) => {
  const center = coordinates;
  const radius = Number(process.env.NEXT_PUBLIC_GEOFENCE_RADIUS ?? 0);
  const options = { units: CircleUnitOption };
  const geofence = circle(center, radius, options);

  return (
    <>
      <Source data={geofence} id="geofence-fill" type="geojson">
        <Layer
          id="circle"
          paint={{
            'fill-color': '#0EA5E9',
            'fill-opacity': 0.2,
          }}
          type="fill"
        />
      </Source>
      <Source data={geofence} id="geofence-line" type="geojson">
        <Layer
          id="line"
          paint={{
            'line-color': '#0EA5E9',
            'line-opacity': 1,
            'line-width': 2,
            'line-offset': 1,
          }}
          type="line"
        />
      </Source>
    </>
  );
};
