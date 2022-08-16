import { Container } from '@components';
import { ISetupStep } from '@interfaces';
import { useRouter } from 'next/router';
import { useCallback } from 'react';

export const SetupStep3: React.FC<ISetupStep> = ({ nextStep }) => {
  const router = useRouter();

  const onSkip = useCallback(() => {
    router.push('/');
  }, [router]);

  return (
    <Container>
      <div className="card m-auto w-[40rem] text-center p-8 bg-base-100 shadow-xl my-8">
        <h2 className="card-title text-center my-4 m-auto">Watch setup</h2>
        <p>
          To use this webapp, you will first need to setup the watch. You can
          also skip it for later but you won&apos;t be able to use it fully
          until then.
        </p>
        <button
          className="w-40 mt-8 m-auto btn btn-secondary"
          onClick={nextStep}
        >
          Continue
        </button>
        <button className="btn btn-link text-secondary" onClick={onSkip}>
          Skip this for later
        </button>
      </div>
    </Container>
  );
};
