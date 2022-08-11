import { Avatar } from '@components';
import { IPlwd } from '@interfaces';
import Link from 'next/link';

export const CardProfile = ({
  showCTA,
  profile,
}: {
  showCTA: boolean;
  profile: IPlwd;
}) => {
  return (
    <div className="card w-96 bg-base-100 shadow-xl items-center">
      <div className="avatar items-center mt-8">
        <Avatar
          firstName={profile.firstName}
          lastName={profile.lastName}
          picture={profile.picture}
        />
      </div>
      <div className="card-body items-center pt-2">
        <h2 className="card-title">
          {profile.firstName} {profile.lastName}
        </h2>
        <p>
          Phone:{' '}
          <a className="link link-secondary" href={`tel:${profile.phone}`}>
            {profile.phone}
          </a>
        </p>
        {showCTA ? (
          <div className="card-actions mt-2">
            <Link href={`/plwd/${profile.id}/location`}>
              <button className="btn btn-secondary">See Location</button>
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
};
