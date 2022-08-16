import { setMilliseconds, setSeconds } from 'date-fns';

export const formatDateWithoutSecondsAndMilliseconds = (dateToFormat: Date) => {
    const dateWithoutSeconds = setSeconds(dateToFormat, 0);
    const dateWithoutMilliseconds = setMilliseconds(dateWithoutSeconds, 0);
    return dateWithoutMilliseconds;
};
