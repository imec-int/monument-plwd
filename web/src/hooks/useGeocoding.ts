import { fetchWrapper } from 'lib/fetch';
import useSWR from 'swr';

type ReturnType = {
  data: string | undefined;
  error: string | undefined;
  loading: boolean;
};

export const useGeocoding = (coordinates?: any): ReturnType => {
  const { data, error } = useSWR(
    coordinates ? `/api/geocoding/${coordinates}` : null,
    fetchWrapper
  );

  const _data = data?.features?.[0]?.place_name;

  return {
    data: _data,
    error,
    loading: !error && !_data,
  };
};
