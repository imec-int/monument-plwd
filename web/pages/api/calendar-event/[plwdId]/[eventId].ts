import { getAccessToken, withApiAuthRequired } from '@auth0/nextjs-auth0';
import { fetchWrapper, logger } from 'lib';
import { CustomError } from 'lib/CustomError';

export default withApiAuthRequired(async (req, res) => {
  const { eventId, plwdId } = req.query;
  const { accessToken } = await getAccessToken(req, res, {
    scopes: [],
  });

  try {
    if (req.method === 'DELETE') {
      const response = await fetchWrapper(
        process.env.MONUMENT_DIARY_API_BASE_URL +
          `/calendar-event/${plwdId}/${eventId}`,
        {
          method: 'delete',
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
    logger.error(finalError, 'CalendarEvent error:');
    res.status(finalError.statusCode).json(finalError);
  }
});
