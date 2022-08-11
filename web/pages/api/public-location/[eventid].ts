import { fetchWrapper, logger } from 'lib';
import { CustomError } from 'lib/CustomError';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function publicLocation(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { eventid } = req.query;

  try {
    if (req.method === 'GET') {
      const response = await fetchWrapper(
        process.env.MONUMENT_DIARY_API_BASE_URL + `/public-location/${eventid}`
      );
      res.status(200).json(response.data);
    } else {
      res.status(405).end();
    }
  } catch (error) {
    const finalError = error as CustomError;
    logger.error(finalError, 'Public location error:');
    res.status(finalError.statusCode).json(finalError);
  }
}
