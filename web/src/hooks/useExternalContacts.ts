import { IExternalContact } from '@interfaces';
import { fetchWrapper } from 'lib/fetch';
import useSWR from 'swr';

type ReturnType = {
  data: IExternalContact[] | undefined;
  error: string | undefined;
  loading: boolean;
};

export const useExternalContacts = (plwdId: string): ReturnType => {
  const { data, error } = useSWR(
    `/api/external-contacts/${plwdId}`,
    fetchWrapper
  );

  return {
    data,
    error,
    loading: !error && !data,
  };
};
