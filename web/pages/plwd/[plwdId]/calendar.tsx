import { withPageAuthRequired } from '@auth0/nextjs-auth0';
import { Calendar as StyledCalendar, Container, Header } from '@components';
import { LayoutWithAppContext } from '@components/layouts/LayoutWithAppContext';
import { useRouter } from 'next/router';
import { ReactElement, useEffect } from 'react';
import { useAppUserContext } from 'src/hooks/useAppUserContext';
import { usePermissions } from 'src/hooks/usePermissions';

export const getServerSideProps = withPageAuthRequired();

const Calendar = () => {
  const { plwd } = useAppUserContext();
  const { canManageCarecircle } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!canManageCarecircle) {
      router.push(`/plwd/${plwd.id}`);
    }
  }, [canManageCarecircle, router, plwd]);

  if (!canManageCarecircle) return null;

  return (
    <Container>
      <Header tabTitle="Monument - Calendar" />
      <div className="h-54">
        <StyledCalendar />
      </div>
    </Container>
  );
};

Calendar.getLayout = function getLayout(page: ReactElement) {
  return <LayoutWithAppContext>{page}</LayoutWithAppContext>;
};

export default Calendar;
