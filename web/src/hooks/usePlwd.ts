import { IPlwd } from '@interfaces';
import { CustomError } from 'lib/CustomError';
import { fetchWrapper } from 'lib/fetch';
import useSWR from 'swr';

interface IusePlwd {
  data: IPlwd;
  error: CustomError;
  loading: boolean;
}

export const usePlwd = (plwdId?: string | null): IusePlwd => {
  const { data, error } = useSWR(
    plwdId ? `/api/plwd/${plwdId}` : null,
    fetchWrapper,
    { shouldRetryOnError: false }
  );

  return {
    data,
    error,
    loading: !error && !data,
  };
};
