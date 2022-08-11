import { getAccessToken, withApiAuthRequired } from '@auth0/nextjs-auth0';
import { fetchWrapper, logger } from 'lib';
import { CustomError } from 'lib/CustomError';

export default withApiAuthRequired(async function getUserByAuth0Id(req, res) {
  const { accessToken } = await getAccessToken(req, res, {
    scopes: [],
  });

  try {
    if (req.method === 'POST') {
      await fetchWrapper(
        process.env.MONUMENT_DIARY_API_BASE_URL + '/simulation',
        {
          method: 'post',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: req.body,
        }
      );
      res.status(200).end();
    } else {
      res.status(405).end();
    }
  } catch (error) {
    const finalError = error as CustomError;
    logger.error(finalError, 'Simulation error:');
    res.status(finalError.statusCode).json(finalError);
  }
});
