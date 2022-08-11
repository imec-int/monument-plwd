import { IUser } from '@interfaces';
import { fetchWrapper } from 'lib/fetch';
import useSWR from 'swr';

export const useCurrentUser = (id?: string | null) => {
  const { data, error } = useSWR(id ? `/api/user/${id}` : null, fetchWrapper, {
    shouldRetryOnError: false,
  });

  return {
    data: data as IUser,
    error,
    loading: !error && !data,
  };
};
