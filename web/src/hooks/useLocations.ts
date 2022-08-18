import { fetchWrapper } from 'lib/fetch';
import useSWR from 'swr';

type ICoordinate = {
  lat: number;
  lng: number;
};

type ILocation = {
  createdAt: string;
  id: string;
  location: ICoordinate;
  timestamp: string;
  watchId: string;
};

type ReturnType = {
  data?: ILocation[];
  error: string | undefined;
  loading: boolean;
};

export const useLocations = (
  plwdId: string,
  refreshInterval?: number
): ReturnType => {
  const { data, error } = useSWR(`/api/locations/${plwdId}`, fetchWrapper, {
    refreshInterval: refreshInterval ?? 0,
    shouldRetryOnError: false,
  });

  return {
    data,
    error,
    loading: !error && !data,
  };
};
