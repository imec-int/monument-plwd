import { IUser } from '@interfaces';
import { CustomError } from 'lib/CustomError';
import { fetchWrapper } from 'lib/fetch';
import useSWR from 'swr';

type ReturnType = {
  data?: IUser;
  error?: CustomError;
  loading: boolean;
};

export const useCurrentUser = (id?: string | null): ReturnType => {
  const { data, error } = useSWR(id ? `/api/user/${id}` : null, fetchWrapper, {
    shouldRetryOnError: false,
  });

  return {
    data,
    error,
    loading: !error && !data,
  };
};
