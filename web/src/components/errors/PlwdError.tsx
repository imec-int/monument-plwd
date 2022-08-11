import { CustomError } from 'lib/CustomError';
import { useRouter } from 'next/router';
import { useCallback } from 'react';

export const PlwdError = ({ error }: { error: CustomError }) => {
  const router = useRouter();

  const onGoBack = useCallback(() => {
    router.push('/switch');
  }, [router]);

  if (error.statusCode === 403) {
    return (
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content text-center">
          <div className="max-w-xl">
            <h1 className="text-5xl font-bold">
              {error.statusCode} | You&apos;re not allowed to access this page
            </h1>
            <button className="btn btn-secondary mt-6" onClick={onGoBack}>
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error.statusCode === 401) {
    return (
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content text-center">
          <div className="max-w-xl">
            <h1 className="text-5xl font-bold">
              {error.statusCode} | Session expired
            </h1>
            <p className="py-6">Signing you out...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-xl">
          <h1 className="text-5xl font-bold">500 | Internal server error</h1>
          <p className="py-6">
            Oops... Something went wrong. Refresh the page to try again.
          </p>
        </div>
      </div>
    </div>
  );
};
