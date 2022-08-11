import { ReactNode } from 'react';
import { Marker } from 'react-map-gl';

const MapCustomMarker = ({
  lat,
  lng,
  children,
}: {
  lat: number;
  lng: number;
  children: ReactNode;
}) => (
  <Marker anchor="bottom" latitude={lat} longitude={lng}>
    <span className="flex h-6 w-6">
      <span className="absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-6 w-6 bg-sky-500 text-white justify-center items-center">
        {children}
      </span>
    </span>
  </Marker>
);

export { MapCustomMarker };
