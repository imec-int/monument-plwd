import { AppUserContext, Spinner } from '@components';
import { CurrentUserError } from '@components/errors/CurrentUserError';
import { PlwdError } from '@components/errors/PlwdError';
import { useRouter } from 'next/router';
import { ReactElement, useEffect, useMemo } from 'react';
import { useCurrentUser } from 'src/hooks/useCurrentUser';
import { usePlwd } from 'src/hooks/usePlwd';

export const LayoutWithAppContext = ({
  children,
}: {
  children: ReactElement;
}) => {
  const router = useRouter();
  const plwdId = router.query.plwdId as string;

  const user = children.props.user;

  const {
    data: currentUser,
    error: currentUserError,
    loading: isLoadingCurrentUser,
  } = useCurrentUser(user.sub);

  const {
    data: plwd,
    error: plwdError,
    loading: isLoadingPlwd,
  } = usePlwd(plwdId);

  useEffect(() => {
    if (currentUser?.id && !currentUser.hasCompletedOnboarding) {
      router.push('/setup');
    }
  }, [currentUser, router]);

  const nudgeCaretakerToSetupWatch = useMemo(() => {
    if (!plwd?.id || !currentUser?.id) return false;

    // We should only nudge the current user when he is the caretaker of the selected PLWD
    // and the watch was not setup yet (=> watchId is empty string).
    if (plwd.caretakerId !== currentUser.id) return false;

    return !plwd.watchId;
  }, [plwd, currentUser]);

  if (isLoadingPlwd || isLoadingCurrentUser) return <Spinner />;

  if (currentUserError) return <CurrentUserError error={currentUserError} />;
  if (plwdError) return <PlwdError error={plwdError} />;

  return (
    <AppUserContext.Provider
      value={{
        hasAccessToMultipleCarecircles: currentUser.carecircles.length > 1,
        nudgeCaretakerToSetupWatch,
        permissions:
          currentUser.carecircles?.find((c) => c.plwd.id === plwd.id)
            ?.permissions ?? [],
        plwd,
        user: currentUser,
      }}
    >
      {children}
    </AppUserContext.Provider>
  );
};
