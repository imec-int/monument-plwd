import { CustomError } from './CustomError';

export const fetchWrapper = async (
  url: string,
  config?: RequestInit
): Promise<any> => {
  const response = await fetch(url, config);

  if (response.ok) {
    return response.json();
  }

  const text = await response.text();

  throw new CustomError({
    message: `Request failed with status: ${response.status} ${response.statusText}`,
    statusCode: response.status,
    statusText: response.statusText,
    text,
  });
};
