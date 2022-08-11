import { Affiliation } from '@constants';
import { ICarecircleMember } from '@interfaces';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const getInitials = (a: string, b: string) => {
  const initials = a.charAt(0) + b.charAt(0);

  return initials.toUpperCase();
};

// Sort carecircle so that the member with PRIMARY_CARETAKER affiliation is first in the array
const sortCarecircleMembers = (carecircle: ICarecircleMember[]) => {
  return carecircle.sort((a, b) => {
    if (a.affiliation === b.affiliation) {
      return 0;
    }
    if (a.affiliation === Affiliation.PRIMARY_CARETAKER) {
      return -1;
    }
    if (b.affiliation === Affiliation.PRIMARY_CARETAKER) {
      return 1;
    }

    return 0;
  });
};

export { fetcher, getInitials, sortCarecircleMembers };
