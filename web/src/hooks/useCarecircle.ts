import { ICarecircleMember } from '@interfaces';
import { fetchWrapper } from 'lib/fetch';
import useSWR from 'swr';

type ReturnType = {
  data: ICarecircleMember[] | undefined;
  error: string | undefined;
  loading: boolean;
};

export const useCarecircle = (plwd?: string | null): ReturnType => {
  const { data, error } = useSWR(
    plwd ? `/api/carecircle-members/${plwd}` : null,
    fetchWrapper,
    { shouldRetryOnError: false }
  );

  return {
    data,
    error,
    loading: !error && !data,
  };
};
