import { WarningAlert } from '@components';
import { Affiliation } from '@constants';
import { ICarecircleMember, IPlwd } from '@interfaces';
import { sortCarecircleMembers } from '@utils';
import Link from 'next/link';

const CarecircleMember = (member: ICarecircleMember) => {
  return (
    <div key={member.id}>
      <p>
        {member.user.firstName} {member.user.lastName} (
        {member.affiliation ?? Affiliation.FAMILY})
      </p>
      <p>
        Phone:{' '}
        <a className="link link-secondary" href={`tel:${member.user.phone}`}>
          {member.user.phone}
        </a>
      </p>
      {/* <p>
        Email:{' '}
        <a className="link link-secondary" href={`mailto:${member.user.email}`}>
          {member.user.email}
        </a>
      </p> */}
    </div>
  );
};

export const CardCareTakers = ({
  carecircle,
  showCarecircle,
  plwd,
}: {
  carecircle: ICarecircleMember[];
  showCarecircle: boolean;
  plwd: IPlwd;
}) => {
  const sortedCarecircle = sortCarecircleMembers(carecircle);

  return (
    <div className="card w-full lg:w-96 bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-center">
          <h2 className="card-title">Caretakers</h2>
          <Link href={`/plwd/${plwd.id}/carecircle`}>
            <p className="link link-secondary ml-2">See carecircle</p>
          </Link>
        </div>
        {showCarecircle ? (
          sortedCarecircle.map((member) => (
            <CarecircleMember key={member.id} {...member} />
          ))
        ) : (
          <WarningAlert text="You don't have access to the carecircle." />
        )}
      </div>
    </div>
  );
};
