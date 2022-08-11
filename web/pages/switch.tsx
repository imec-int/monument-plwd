import { UserProfile, withPageAuthRequired } from '@auth0/nextjs-auth0';
import { Avatar, Container, Spinner } from '@components';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo } from 'react';
import { useCurrentUser } from 'src/hooks/useCurrentUser';

type Props = { user: UserProfile };

export const getServerSideProps = withPageAuthRequired();

const Switch = ({ user }: Props) => {
  const {
    data: currentUser,
    error: currentUserError,
    loading: isLoadingCurrentUser,
  } = useCurrentUser(user.sub);
  const router = useRouter();

  const userIsLinkedToOnlyOneCarecircle = useMemo(() => {
    if (!currentUser) return false;

    return currentUser.carecircles.length === 1;
  }, [currentUser]);

  useEffect(() => {
    if (isLoadingCurrentUser) return;
    if (!currentUser || !currentUser.hasCompletedOnboarding) {
      router.push('/setup');
    }
  }, [currentUser, router, isLoadingCurrentUser]);

  useEffect(() => {
    if (userIsLinkedToOnlyOneCarecircle) {
      const [carecircle] = currentUser.carecircles;
      router.push(`/plwd/${carecircle.plwd.id}`);
    }
  }, [userIsLinkedToOnlyOneCarecircle, currentUser, router]);

  if (isLoadingCurrentUser) return <Spinner />;

  if (currentUserError) return <div>{currentUserError.message}</div>;

  // Do not show the list when loading the page in case user only is linked to one carecircle
  if (userIsLinkedToOnlyOneCarecircle) return null;

  return (
    <Container>
      <Head>
        <title>Monument - Select carecircle</title>
      </Head>
      <div className="flex flex-col items-center gap-8">
        <div className="navbar bg-base-100">
          <div className="px-10 pt-10 relative w-xl h-24">
            <Image
              alt="Monument logo"
              layout="fill"
              objectFit="contain"
              src="/images/logo.png"
            />
          </div>
        </div>
        <h2 className="text-xl">For which person do you want to login?</h2>
        <div className="card p-8 shadow-xl mb-24">
          <ul className="menu bg-base-100 p-2 rounded-box">
            {currentUser.carecircles.length === 0 ? (
              <p>Oops... you are not assigned to any person.</p>
            ) : null}
            {currentUser.carecircles.map((carecircle) => (
              <li key={carecircle.id}>
                <Link href={`/plwd/${carecircle.plwd.id}`}>
                  <div className="flex">
                    <Avatar
                      firstName={carecircle.plwd.firstName}
                      lastName={carecircle.plwd.lastName}
                      picture={carecircle.plwd.picture}
                    />
                    <p>
                      {carecircle.plwd.firstName} {carecircle.plwd.lastName}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Container>
  );
};

export default Switch;
