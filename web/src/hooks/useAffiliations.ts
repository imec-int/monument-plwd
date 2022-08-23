import { IAffiliation } from '@interfaces';
import { fetchWrapper } from 'lib/fetch';
import useSWR from 'swr';

type ReturnType = {
  data: IAffiliation[] | undefined;
  error: string | undefined;
  loading: boolean;
};

export const useAffiliations = (plwdId: string): ReturnType => {
  const { data, error } = useSWR(`/api/affiliations/${plwdId}`, fetchWrapper);

  return {
    data,
    error,
    loading: !error && !data,
  };
};
