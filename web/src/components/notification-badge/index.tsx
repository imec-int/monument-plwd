import Link from 'next/link';
import { useMemo } from 'react';
import { useAppUserContext } from 'src/hooks/useAppUserContext';

export const NotificationBadge = () => {
  const { nudgeCaretakerToSetupWatch } = useAppUserContext();

  const notifications = useMemo(() => {
    const list = [];

    if (nudgeCaretakerToSetupWatch) {
      list.push({ link: '/setup', title: 'You have to setup the watch' });
    }

    return list;
  }, [nudgeCaretakerToSetupWatch]);

  return (
    <div className="dropdown dropdown-end">
      <label className="btn btn-ghost btn-circle" tabIndex={0}>
        <div className="indicator">
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {notifications.length > 0 ? (
            <span className="badge badge-sm badge-secondary indicator-item">
              {notifications.length}
            </span>
          ) : null}
        </div>
      </label>
      <div
        className="mt-3 card card-compact dropdown-content w-60 bg-base-100 shadow"
        tabIndex={0}
      >
        <div className="card-body">
          <span className="font-bold text-lg">
            {notifications.length} Notification
            {notifications.length > 1 || notifications.length === 0 ? 's' : ''}
          </span>
          {notifications.length === 0 ? (
            <p>Well done! No notifications</p>
          ) : (
            <div className="divide-y">
              {notifications.map((notification, idx) => (
                <Link href={notification.link} key={idx}>
                  <p className="link link-secondary py-2">
                    {notification.title}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
