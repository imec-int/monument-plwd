import { IPlwd, IUser } from '@interfaces';
import { createContext } from 'react';

export const userDefault = {
  address: {
    description: '',
    geometry: {
      location: {
        lat: 0,
        lng: 0,
      },
    },
  },
  auth0Id: '',
  carecircles: [],
  caretakerId: '',
  email: '',
  firstName: '',
  id: '',
  lastName: '',
  phone: '',
  picture: '',
  role: '',
};

export const plwdDefault = {
  ...userDefault,
  caretaker: userDefault,
  watchId: '',
};

export const AppUserContext = createContext({
  hasAccessToMultipleCarecircles: false,
  nudgeCaretakerToSetupWatch: false,
  permissions: [] as string[],
  plwd: plwdDefault as IPlwd,
  user: userDefault as IUser,
});

export default AppUserContext;
