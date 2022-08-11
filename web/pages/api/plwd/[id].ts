import { getAccessToken, withApiAuthRequired } from '@auth0/nextjs-auth0';
import { fetchWrapper, logger } from 'lib';
import { CustomError } from 'lib/CustomError';

export default withApiAuthRequired(async (req, res) => {
  const { id } = req.query;

  const { accessToken } = await getAccessToken(req, res, {
    scopes: [],
  });

  try {
    if (req.method === 'PATCH') {
      const response = await fetchWrapper(
        `${process.env.MONUMENT_DIARY_API_BASE_URL}/plwd/${id}`,
        {
          method: 'patch',
          body: req.body,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );
      res.status(200).json(response.data);
    } else if (req.method === 'GET') {
      const response = await fetchWrapper(
        `${process.env.MONUMENT_DIARY_API_BASE_URL}/plwd/${id}`,
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
    logger.error(finalError, `${req.method} plwd error:`);
    res.status(finalError.statusCode).json(finalError);
  }
});
