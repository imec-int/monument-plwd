import { ILocationWithAddress } from '@interfaces';
import { useEffect, useMemo, useState } from 'react';
import ReactMapGL, { Layer, Marker, Source } from 'react-map-gl';

export default function Map({
  currentLocation,
  locations,
}: {
  currentLocation: ILocationWithAddress;
  locations?: ILocationWithAddress[];
}) {
  const [latitude, setLatitude] = useState<number>(0);
  const [longitude, setLongitude] = useState<number>(0);

  useEffect(() => {
    if (currentLocation?.location) {
      setLatitude(currentLocation.location.lat);
      setLongitude(currentLocation.location.lng);
    }
  }, [currentLocation]);

  if (latitude && longitude) {
    return (
      <ReactMapGL
        dragPan
        initialViewState={{
          latitude,
          longitude,
          zoom: 12,
        }}
        mapStyle="mapbox://styles/mapbox/dark-v9"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      >
        {/* 51.21645030497296, 4.423584313166383 */}
        <Marker anchor="bottom" latitude={latitude} longitude={longitude}>
          <span className="flex h-6 w-6">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-6 w-6 bg-sky-500"></span>
          </span>
        </Marker>
        {locations && locations.length > 1 && (
          <Source
            data={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: locations?.map(({ location }) => [
                  location.lng,
                  location.lat,
                ]),
              },
            }}
            id="polylineLayer"
            type="geojson"
          >
            <Layer
              id="lineLayer"
              layout={{
                'line-join': 'round',
                'line-cap': 'round',
              }}
              paint={{
                'line-color': 'rgba(3, 170, 238, 0.5)',
                'line-width': 5,
              }}
              source="my-data"
              type="line"
            />
          </Source>
        )}
      </ReactMapGL>
    );
  }

  return <div></div>;
}
