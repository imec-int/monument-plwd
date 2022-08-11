import { IEvent } from '@interfaces';
import { fetchWrapper } from 'lib/fetch';
import useSWR from 'swr';

type ReturnType = {
  data: IEvent[] | undefined;
  error: string | undefined;
  loading: boolean;
};

export const useCalendarEvents = (plwdId: string): ReturnType => {
  const { data, error } = useSWR(
    `/api/calendar-events/${plwdId}`,
    fetchWrapper,
    { shouldRetryOnError: false }
  );

  return {
    data,
    error,
    loading: !error && !data,
  };
};
