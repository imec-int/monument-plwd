import { withPageAuthRequired } from '@auth0/nextjs-auth0';
import { Calendar, Container, Header } from '@components';
import { LayoutWithAppContext } from '@components/layouts/LayoutWithAppContext';
import { useRouter } from 'next/router';
import { ReactElement, useEffect } from 'react';
import { useAppUserContext } from 'src/hooks/useAppUserContext';
import { usePermissions } from 'src/hooks/usePermissions';

export const getServerSideProps = withPageAuthRequired();

const CalendarPage = () => {
  const { plwd } = useAppUserContext();
  const { canAccessCalendar } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!canAccessCalendar) {
      router.push(`/plwd/${plwd.id}`);
    }
  }, [canAccessCalendar, router, plwd]);

  if (!canAccessCalendar) return null;

  return (
    <Container>
      <Header tabTitle="Monument - Calendar" />
      <div className="h-54">
        <Calendar />
      </div>
    </Container>
  );
};

CalendarPage.getLayout = function getLayout(page: ReactElement) {
  return <LayoutWithAppContext>{page}</LayoutWithAppContext>;
};

export default CalendarPage;
