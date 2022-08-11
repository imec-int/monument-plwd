import { IPlwd, IUser } from '@interfaces';
import { useMemo } from 'react';

import { useAppUserContext } from './useAppUserContext';

// TODO: move this to enum files and re-use in the add-contact-modal
enum LocationPermissions {
  'when-assigned:locations' = 'when-assigned:locations',
  'always:locations' = 'always:locations',
}
enum CalendarPermissions {
  'never:calendar' = 'never:calendar',
  'read:calendar' = 'read:calendar',
  'manage:calendar' = 'manage:calendar',
}

enum CarecirclePermissions {
  'never:carecircle' = 'never:carecircle',
  'read:carecircle' = 'read:carecircle',
  'manage:carecircle' = 'manage:carecircle',
}

enum UserRole {
  ADMIN = 'admin',
  PRIMARY_CARETAKER = 'primary_caretaker',
  USER = 'user',
}

const isAdmin = (role: string) => role === UserRole.ADMIN;
const userIsCaretakerOfPlwd = (user: IUser, plwd: IPlwd) => {
  return user.id === plwd.caretakerId;
};

export const usePermissions = () => {
  const { permissions, user, plwd } = useAppUserContext();

  const canAccessLocation = useMemo(() => {
    if (isAdmin(user.role)) return true;
    if (userIsCaretakerOfPlwd(user, plwd)) return true;

    return (
      permissions.includes(LocationPermissions['when-assigned:locations']) ||
      permissions.includes(LocationPermissions['always:locations'])
    );
  }, [permissions, user, plwd]);

  const canManageLocation = useMemo(() => {
    if (isAdmin(user.role)) return true;
    if (userIsCaretakerOfPlwd(user, plwd)) return true;

    return permissions.includes(LocationPermissions['always:locations']);
  }, [permissions, user, plwd]);

  const canAccessCalendar = useMemo(() => {
    if (isAdmin(user.role)) return true;
    if (userIsCaretakerOfPlwd(user, plwd)) return true;

    return (
      permissions.includes(CalendarPermissions['read:calendar']) ||
      permissions.includes(CalendarPermissions['manage:calendar'])
    );
  }, [permissions, user, plwd]);

  const canManageCalendar = useMemo(() => {
    if (isAdmin(user.role)) return true;
    if (userIsCaretakerOfPlwd(user, plwd)) return true;

    return permissions.includes(CalendarPermissions['manage:calendar']);
  }, [permissions, user, plwd]);

  const canAccessCarecircle = useMemo(() => {
    if (isAdmin(user.role)) return true;
    if (userIsCaretakerOfPlwd(user, plwd)) return true;

    return (
      permissions.includes(CarecirclePermissions['read:carecircle']) ||
      permissions.includes(CarecirclePermissions['manage:carecircle'])
    );
  }, [permissions, user, plwd]);

  const canManageCarecircle = useMemo(() => {
    if (isAdmin(user.role)) return true;
    if (userIsCaretakerOfPlwd(user, plwd)) return true;

    return permissions.includes(CarecirclePermissions['manage:carecircle']);
  }, [permissions, user, plwd]);

  return {
    canAccessCalendar,
    canAccessCarecircle,
    canAccessLocation,
    canManageCalendar,
    canManageCarecircle,
    canManageLocation,
  };
};
