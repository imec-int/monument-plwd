import { getAccessToken, withApiAuthRequired } from '@auth0/nextjs-auth0';
import { fetchWrapper, logger } from 'lib';
import { CustomError } from 'lib/CustomError';

export default withApiAuthRequired(async (req, res) => {
  const { accessToken } = await getAccessToken(req, res, {
    scopes: [],
  });

  try {
    if (req.method === 'POST') {
      const response = await fetchWrapper(process.env.API_BASE_URL + '/user', {
        method: 'POST',
        body: req.body,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
      res.status(200).json(response.data);
    } else {
      res.status(405).end();
    }
  } catch (error) {
    const finalError = error as CustomError;
    logger.error(finalError, 'User update error:');
    res.status(finalError.statusCode).json(finalError);
  }
});
