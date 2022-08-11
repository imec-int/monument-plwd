import { AppUserContext } from '@components';
import { useContext } from 'react';

export const useAppUserContext = () => {
  return useContext(AppUserContext);
};
