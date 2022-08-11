import { getInitials } from '@utils';
import Image from 'next/image';

interface IAvatar {
  picture?: string;
  firstName?: string;
  lastName?: string;
}

export const ProfileAvatar: React.FC<IAvatar> = ({
  picture,
  firstName,
  lastName,
}) =>
  picture ? (
    <div className="btn btn-ghost btn-circle avatar placeholder" tabIndex={0}>
      <div className="rounded-full w-10 h-10">
        <Image alt="profile avatar" height={40} src={picture} width={40} />
      </div>
    </div>
  ) : (
    <div className="btn btn-ghost btn-circle avatar placeholder" tabIndex={0}>
      <div className="bg-neutral-focus text-neutral-content mask rounded-full w-10">
        <span className="">
          {firstName && lastName ? getInitials(firstName, lastName) : ''}
        </span>
      </div>
    </div>
  );

export const Avatar: React.FC<IAvatar> = ({ picture, firstName, lastName }) =>
  picture ? (
    <div className="avatar items-center">
      <div className="w-16 mask mask-squircle">
        <Image alt="avatar" layout="fill" src={picture} />
      </div>
    </div>
  ) : (
    <div className="avatar placeholder">
      <div className="bg-neutral-focus text-neutral-content mask mask-squircle w-16">
        <span className="text-xl">
          {firstName && lastName ? getInitials(firstName, lastName) : ''}
        </span>
      </div>
    </div>
  );
