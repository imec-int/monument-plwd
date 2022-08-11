import { withPageAuthRequired } from '@auth0/nextjs-auth0';
import { Container, Header, WarningAlert } from '@components';
import { LayoutWithAppContext } from '@components/layouts/LayoutWithAppContext';
import { IEvent } from '@interfaces';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ReactElement, useMemo } from 'react';
import { useAppUserContext } from 'src/hooks/useAppUserContext';
import { useCalendarEvents } from 'src/hooks/useCalendarEvents';
import { useGeocoding } from 'src/hooks/useGeocoding';
import { useLocations } from 'src/hooks/useLocations';
import { usePermissions } from 'src/hooks/usePermissions';
// See: https://day.js.org/docs/en/plugin/advanced-format
dayjs.extend(advancedFormat);

export const getServerSideProps = withPageAuthRequired();

const Map = dynamic(() => import('../../../src/components/map'), {
  loading: () => <p>loading...</p>,
  ssr: false,
});

const eventIsOngoingEvent = (event: IEvent) => {
  if (!event.startTime || !event.endTime) return false;

  const now = dayjs();
  const startTime = dayjs(event.startTime);
  const endTime = dayjs(event.endTime);

  return now.isAfter(startTime) && now.isBefore(endTime);
};

const refreshInterval = 30000; // refresh every 30s

const Location = () => {
  const { plwd, user, nudgeCaretakerToSetupWatch } = useAppUserContext();
  const { canAccessLocation, canManageLocation } = usePermissions();

  const { data: calendarEvents = [] } = useCalendarEvents(plwd.id);
  const { data: locations = [] } = useLocations(user.auth0Id, refreshInterval);

  const [currentLocation] = locations;

  const coordinates = currentLocation
    ? JSON.stringify([
        currentLocation.location.lng,
        currentLocation.location.lat,
      ])
    : undefined;

  const { data: currentLocationAddress = 'Loading...' } =
    useGeocoding(coordinates);

  const hasOngoingCalendarEvent = useMemo(() => {
    return calendarEvents.filter(eventIsOngoingEvent).length > 0;
  }, [calendarEvents]);

  const today = dayjs().startOf('day').format('Do MMMM');

  if (nudgeCaretakerToSetupWatch) {
    return (
      <Container>
        <Header tabTitle="Monument - Location" />
        <WarningAlert
          actions={
            <div className="flex-none">
              <Link href="/setup">
                <button className="btn btn-sm btn-secondary">setup now</button>
              </Link>
            </div>
          }
          text="To have access to the location page you have to setup the watch
          first"
        />
      </Container>
    );
  }

  return (
    <Container className="h-screen">
      <Header tabTitle="Monument - Location" />
      {canManageLocation || (canAccessLocation && hasOngoingCalendarEvent) ? (
        <>
          <h2 className="card-title mb-2">Last known location</h2>
          <p className="mb-4">{currentLocationAddress}</p>
          <div className="w-full h-4/6 flex gap-4 mb-8">
            <div className="flex-1 rounded-xl overflow-hidden shadow-xl">
              <Map currentLocation={currentLocation} />
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
                        {locations.map((location) => {
                          return (
                            <tr key={location.id}>
                              <td>
                                {dayjs(location.timestamp).format(
                                  'MMM DD HH:mm'
                                )}
                              </td>
                              <td className="whitespace-normal">
                                Frank is at his house
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <WarningAlert text="You currently don't have access to the location of the user." />
      )}
    </Container>
  );
};

Location.getLayout = function getLayout(page: ReactElement) {
  return <LayoutWithAppContext>{page}</LayoutWithAppContext>;
};

export default Location;
