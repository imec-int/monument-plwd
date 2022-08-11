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
  userId: string;
};

type ReturnType = {
  data?: ILocation[];
  error: string | undefined;
  loading: boolean;
};

export const useLocations = (
  auth0Id?: string | null,
  refreshInterval?: number
): ReturnType => {
  const { data, error } = useSWR(
    auth0Id ? `/api/locations/${auth0Id}` : null,
    fetchWrapper,
    { refreshInterval: refreshInterval ?? 0, shouldRetryOnError: false }
  );

  return {
    data,
    error,
    loading: !error && !data,
  };
};
