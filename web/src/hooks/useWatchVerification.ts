import { fetchWrapper } from 'lib/fetch';
import useSWR from 'swr';

export const useWatchVerification = (imei?: string) => {
  const { data, error } = useSWR(imei ? `/api/location` : null, fetchWrapper);

  return {
    data,
    error,
    loading: !error && !data,
  };
};
