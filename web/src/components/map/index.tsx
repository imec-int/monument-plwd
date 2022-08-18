import { ILocationWithAddress } from '@interfaces';
import { useEffect, useRef, useState } from 'react';
import ReactMapGL, { Layer, MapRef, Marker, Source } from 'react-map-gl';

export default function Map({
  currentLocation,
  locations,
}: {
  currentLocation: ILocationWithAddress;
  locations?: ILocationWithAddress[];
}) {
  const mapRef = useRef<MapRef>(null);
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (currentLocation?.location) {
      setLatitude(currentLocation.location.lat);
      setLongitude(currentLocation.location.lng);
    }
  }, [currentLocation]);

  useEffect(() => {
    if (mapRef && mapRef.current) {
      mapRef.current.flyTo({
        center: [longitude ?? 0, latitude ?? 0],
        zoom: 12,
      });
    }
  }, [longitude, latitude]);

  if (typeof latitude === 'number' && typeof longitude === 'number') {
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
        ref={mapRef}
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
