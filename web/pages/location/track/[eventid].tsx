import { Container, Header, LinkGoogleMap } from '@components';
import { Ilocation, ILocationWithAddress } from '@interfaces';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

// See: https://day.js.org/docs/en/plugin/advanced-format
dayjs.extend(advancedFormat);

const LocationTrack: React.FC = () => {
  const router = useRouter();
  const { eventid } = router.query;
  const Map = dynamic(() => import('../../../src/components/map'), {
    loading: () => <p>loading...</p>,
    ssr: false,
  });

  const [isLost, setIsLost] = useState(true);
  const [isLoading, setLoading] = useState(false);
  const [locations, setLocations] = useState<ILocationWithAddress[] | []>([]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/public-location/${eventid}`)
      .then((res) => res.json())
      .then(async (data) => {
        if (!data || !data[0]?.location) {
          setLoading(false);

          return;
        }

        // Loop through the data to create an array of locations
        const locationsWithAddresses = data.map(async (location: Ilocation) => {
          const coordinates = JSON.stringify([
            location.location.lng,
            location.location.lat,
          ]);

          return await fetch(`/api/geocoding/${coordinates}`)
            .then((res) => res.json())
            .then((data) => {
              return {
                location: location.location,
                timestamp: location.timestamp,
                address: data.features[0].place_name,
              };
            });
        });

        const locations = await Promise.all(locationsWithAddresses);
        setLocations(locations);
        setLoading(false);
      });
  }, [eventid]);

  const today = dayjs().startOf('day').format('Do MMMM');

  return (
    <Container className="min-h-screen">
      <Header isPublic tabTitle="Monument - Location" />
      {!locations && isLoading && (
        <p>
          <span aria-label="loading" role="img">
            ⏳
          </span>
          Loading...
        </p>
      )}
      {(!locations || !locations.length) && !isLoading && (
        <p>
          Oops... It seems the event is not active or there is no locations from
          the watch during the time of the event.
        </p>
      )}
      {locations[0] && (
        <div>
          {isLost && (
            <div className="alert shadow-lg mb-4 mt-0">
              <div>
                <svg
                  className="stroke-info flex-shrink-0 w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  ></path>
                </svg>
                <span>
                  The plwd seems to be lost. He is late to his appointment. The
                  contact person has been contacted.
                </span>
              </div>
              <div className="flex-none">
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => setIsLost(false)}
                >
                  Close
                </button>
              </div>
            </div>
          )}
          <h2 className="card-title mb-2">Last known location</h2>
          <div className="flex gap-2">
            <p className="mb-4">{locations[0].address}</p>
            <LinkGoogleMap
              lat={locations[0]?.location.lat}
              lng={locations[0]?.location.lng}
            />
          </div>
          <div className="w-full flex flex-col md:flex-row gap-4 mb-8 h-[420px]">
            <div className="flex-1 rounded-xl overflow-hidden shadow-xl">
              <Map currentLocation={locations[0]} locations={locations} />
            </div>
            <div className="max-w-md">
              <div className="card w-full h-full bg-base-100 shadow-xl overflow-scroll">
                <div className="card-body">
                  <h2 className="card-title">Time log of wandering {today}</h2>
                  <div className="overflow-x-auto">
                    <table className="table w-full">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Event</th>
                        </tr>
                      </thead>
                      <tbody>
                        {locations[0] &&
                          locations.map((location, i) => (
                            <tr key={i}>
                              <td>
                                {dayjs(location.timestamp).format(
                                  'MMM DD HH:mm'
                                )}
                              </td>
                              <td className="whitespace-normal">
                                {location.address}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};

export default LocationTrack;
