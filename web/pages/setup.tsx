import { UserProfile, withPageAuthRequired } from '@auth0/nextjs-auth0';
import {
  Container,
  Header,
  SetupStep1,
  SetupStep2,
  SetupStep3,
  SetupStep4,
} from '@components';
import { Affiliation } from '@constants';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { useCurrentUser } from 'src/hooks/useCurrentUser';
import { mutate } from 'swr';

type Props = { user: UserProfile };
export const getServerSideProps = withPageAuthRequired();

const Setup = ({ user: authenticatedUser }: Props) => {
  const [step, setStep] = useState(1);
  const router = useRouter();

  const getUserData = useCallback(async () => {
    await mutate(`/api/user/${authenticatedUser.sub}`);
  }, [authenticatedUser]);

  // Goto next step
  const nextStep = useCallback(() => {
    getUserData();
    setStep(step + 1);
  }, [step, getUserData]);

  const previousStep = useCallback(() => {
    setStep((s) => s - 1);
  }, []);

  const { data: currentUser } = useCurrentUser(authenticatedUser.sub);

  const userData = {
    currentUser,
    authenticatedUser,
  };

  // Go to step
  const goToStep = (step: number) => {
    setStep(step);
  };

  useEffect(() => {
    if (currentUser?.id) {
      if (
        !currentUser.carecircles
          .filter((c) => c.affiliation === Affiliation.PRIMARY_CARETAKER)
          .find((c) => !c.plwd.watchId) &&
        currentUser.carecircles.length > 0
      ) {
        router.push('/switch');

        return;
      }

      if (currentUser.hasCompletedOnboarding) {
        if (step < 3) {
          goToStep(3);
        }

        return;
      }

      if (step === 1) {
        goToStep(2);
      }
    }
  }, [step, currentUser, nextStep, router]);

  // Check which step and return step component
  const getStep = () => {
    switch (step) {
      case 1:
        return <SetupStep1 nextStep={nextStep} userData={userData} />;
      case 2:
        return <SetupStep2 nextStep={nextStep} userData={userData} />;
      case 3:
        return <SetupStep3 nextStep={nextStep} userData={userData} />;
      case 4:
        return (
          <SetupStep4
            nextStep={nextStep}
            previousStep={previousStep}
            userData={userData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Container>
      <Header isPublic={true} tabTitle="Monument - Setup" />
      <ul className="steps w-[32rem] pb-4 m-auto">
        <li className="step step-secondary">My profile</li>
        <li className={`step ${step > 1 ? 'step-secondary' : ''}`}>
          PLWD details
        </li>
        <li className={`step ${step > 2 ? 'step-secondary' : ''}`}>
          Watch setup
        </li>
      </ul>
      {getStep()}
    </Container>
  );
};

export default Setup;
