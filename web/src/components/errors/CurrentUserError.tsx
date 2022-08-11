import { CustomError } from 'lib/CustomError';
import { useRouter } from 'next/router';
import { useCallback } from 'react';

export const CurrentUserError = ({ error }: { error: CustomError }) => {
  const router = useRouter();

  const onLogout = useCallback(() => {
    router.push('/api/auth/logout');
  }, [router]);

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
            <br />
            Or logout and retry again.
          </p>
          <button className="btn btn-secondary mt-6" onClick={onLogout}>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
};
