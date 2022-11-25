import { withPageAuthRequired } from '@auth0/nextjs-auth0';
import {
  Calendar,
  CardCareTakers,
  CardProfile,
  Container,
  Header,
  WarningAlert,
} from '@components';
import { LayoutWithAppContext } from '@components/layouts/LayoutWithAppContext';
import { ReactElement } from 'react';
import { useAppUserContext } from 'src/hooks/useAppUserContext';
import { useCarecircle } from 'src/hooks/useCarecircle';
import { usePermissions } from 'src/hooks/usePermissions';

export const getServerSideProps = withPageAuthRequired();

const Home = () => {
  const { plwd } = useAppUserContext();
  const { canAccessLocation, canAccessCarecircle, canAccessCalendar } =
    usePermissions();

  const { data: carecircle = [] } = useCarecircle(plwd.id);

  return (
    <Container>
      <Header tabTitle="Monument - Home" />
      <div className="flex flex-col lg:flex-row gap-8">
        <div>
          <div className="mb-4 w-full">
            <CardProfile profile={plwd} showCTA={canAccessLocation} />
          </div>
          <CardCareTakers
            carecircle={carecircle}
            plwd={plwd}
            showCarecircle={canAccessCarecircle}
          />
        </div>
        <div className="flex-1">
          {canAccessCalendar ? (
            <Calendar
              headerToolbarEnabled={false}
              height="528px"
              initialView="timeGridWeek"
            />
          ) : (
            <div className="hero h-[528px] bg-base-200">
              <div className="hero-content text-center">
                <div className="max-w-md">
                  <WarningAlert text="You don't have access to the calendar." />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
};

Home.getLayout = function getLayout(page: ReactElement) {
  return <LayoutWithAppContext>{page}</LayoutWithAppContext>;
};

export default Home;
