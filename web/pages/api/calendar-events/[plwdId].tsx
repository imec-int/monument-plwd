import { getAccessToken, withApiAuthRequired } from '@auth0/nextjs-auth0';
import { fetchWrapper, logger } from 'lib';
import { CustomError } from 'lib/CustomError';

export default withApiAuthRequired(async (req, res) => {
  const { plwdId } = req.query;
  const { accessToken } = await getAccessToken(req, res, {
    scopes: [],
  });

  try {
    if (req.method === 'GET') {
      const response = await fetchWrapper(
        `${process.env.API_BASE_URL}/calendar-events/${plwdId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      res.status(200).json(response.data);
    } else {
      res.status(405).end();
    }
  } catch (error) {
    const finalError = error as CustomError;
    logger.error(finalError, 'Failed to fetch CalendarEvents:');
    res.status(finalError.statusCode).json(finalError);
  }
});
