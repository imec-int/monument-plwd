import { Container } from '@components';
import { ISetupStep } from '@interfaces';
import Image from 'next/image';

export const SetupStep3: React.FC<ISetupStep> = ({ nextStep, userData }) => {
  return (
    <Container>
      <div className="card m-auto w-[40rem] text-center p-8 bg-base-100 shadow-xl my-8">
        <h2 className="card-title text-center my-4 m-auto">Watch setup</h2>
        <p>
          To use this webapp, you will first need to setup the watch. You can
          also skip it for later but you won&apos;t be able to use it fully
          until then.
        </p>
        <p className="my-4">Please follow the steps below</p>
        <p className="mb-2">Step 1.</p>
        <div className="w-full h-80 relative">
          <Image
            alt="Step 1 Smartwatch setup"
            layout="fill"
            objectFit="contain"
            src="/images/smartsetup.avif"
          />
        </div>
        <button
          className="w-40 mt-8 m-auto btn btn-secondary"
          onClick={nextStep}
        >
          Continue
        </button>
        <button className="btn btn-link text-secondary" onClick={nextStep}>
          Skip this for later
        </button>
      </div>
    </Container>
  );
};
