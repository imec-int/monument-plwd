import { withPageAuthRequired } from '@auth0/nextjs-auth0';
import { Container } from '@components/container';
import { Header } from '@components/header';
import { LayoutWithAppContext } from '@components/layouts/LayoutWithAppContext';
import Link from 'next/link';
import { ReactElement } from 'react';
import { useAppUserContext } from 'src/hooks/useAppUserContext';
import { usePermissions } from 'src/hooks/usePermissions';

export const getServerSideProps = withPageAuthRequired();

const Help = () => {
  const { canManageCarecircle } = usePermissions();
  const { plwd } = useAppUserContext();

  return (
    <Container>
      <Header tabTitle="Monument - Help" />
      <div className="max-w-md m-auto">
        <div className="card w-full p-8 bg-base-100 shadow-xl">
          <h2 className="card-title mb-4">Help - FAQ</h2>
          <div
            className="collapse collapse-plus border border-base-300 bg-base-100 rounded-box"
            tabIndex={0}
          >
            <input className="peer" type="checkbox" />
            <div className="collapse-title text-xl font-medium">
              I registered a watch but no location is shown on the location
              page.
            </div>
            <div className="collapse-content">
              <p>
                Verify that the IMEI number you registered corresponds with the
                one of your watch.
                <br />
                <br />
                You may update it via the{' '}
                {canManageCarecircle ? (
                  <Link
                    href={`/plwd/${plwd.id}/profile`}
                    legacyBehavior
                    passHref
                  >
                    <a className="link link-secondary">Profile</a>
                  </Link>
                ) : (
                  <span>Profile</span>
                )}{' '}
                page
              </p>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};

Help.getLayout = function getLayout(page: ReactElement) {
  return <LayoutWithAppContext>{page}</LayoutWithAppContext>;
};

export default Help;
