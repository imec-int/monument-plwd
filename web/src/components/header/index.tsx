import { NotificationBadge } from '@components';
import { ProfileAvatar } from '@components/avatar';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import useTranslation from 'next-translate/useTranslation';
import { useAppUserContext } from 'src/hooks/useAppUserContext';
import { usePermissions } from 'src/hooks/usePermissions';

interface IHeader {
  isPublic?: boolean;
  tabTitle?: string;
}

const Logo = ({ url }: { url: string }) => (
  <Link href={url}>
    <div className="cursor-pointer">
      <Image
        alt="Monument logo"
        height="64"
        src="/images/interreg-logo.svg"
        width="200"
      />
    </div>
  </Link>
);

export const Header: React.FC<IHeader> = ({ tabTitle, isPublic }) => {
  const { t } = useTranslation('common');
  const { user, plwd, hasAccessToMultipleCarecircles } = useAppUserContext();
  const { canAccessCarecircle, canAccessCalendar, canManageCarecircle } =
    usePermissions();

  const basePath = `/plwd/${plwd.id}`;

  const navLinks = (
    <>
      <li>
        <Link href={basePath}>{t('home')}</Link>
      </li>
      <li>
        <Link href={`${basePath}/location`}>{t('location')}</Link>
      </li>
      {canAccessCalendar ? (
        <li>
          <Link href={`${basePath}/calendar`}>{t('calendar')}</Link>
        </li>
      ) : null}
      {canAccessCarecircle ? (
        <li>
          <Link href={`${basePath}/carecircle`}>{t('carecircle')}</Link>
        </li>
      ) : null}
      <li>
        <Link href={`${basePath}/simulation`}>{t('simulation')}</Link>
      </li>
      <li>
        <Link href={`${basePath}/help`}>{t('help')}</Link>
      </li>
    </>
  );

  return (
    <div className="navbar bg-base-100 p-0 mx-0 mt-4 mb-4">
      <Head>
        <title>{tabTitle || 'Monument'}</title>
      </Head>
      {isPublic ? (
        <Logo url="/" />
      ) : (
        <>
          <div className="flex-1">
            <Logo url={basePath} />
          </div>
          <div>
            <div className="dropdown dropdown-end ml-2">
              <label
                className="flex lg:hidden btn btn-ghost items-center"
                tabIndex={0}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </label>
              <ul
                className="menu menu-compact lg:hidden dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-52"
                tabIndex={0}
              >
                {navLinks}
              </ul>
              <ul className="hidden lg:flex menu menu-horizontal p-0">
                {navLinks}
              </ul>
            </div>
            <NotificationBadge />
            <div className="dropdown dropdown-end ml-2">
              <ProfileAvatar
                firstName={user.firstName}
                lastName={user.lastName}
                picture={user.picture}
              />
              <ul
                className="menu menu-compact dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-52"
                tabIndex={1}
              >
                <li>
                  <Link href={`${basePath}/profile`}>
                    <div className="justify-between">Profile</div>
                  </Link>
                </li>
                {canManageCarecircle ? (
                  <li>
                    <Link href={`${basePath}/plwd`}>
                      <div className="justify-between">PLWD Info</div>
                    </Link>
                  </li>
                ) : null}
                {hasAccessToMultipleCarecircles ? (
                  <li>
                    <Link href="/switch">
                      <div className="justify-between">Switch carecircle</div>
                    </Link>
                  </li>
                ) : null}
                <li>
                  <Link href={'/api/auth/logout'}>{t('logoutButton')}</Link>
                </li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
