import { fetchWrapper, logger } from 'lib';
import { CustomError } from 'lib/CustomError';

export default async function geocoding(req: any, res: any) {
  const { coordinates } = req.query;
  const transformedCoordinates = JSON.parse(coordinates);
  const longitude = transformedCoordinates[0];
  const latitude = transformedCoordinates[1];

  try {
    if (req.method === 'GET') {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?types=place%2Cpostcode%2Caddress&limit=1&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`;
      const response = await fetchWrapper(url);
      res.status(200).json(response);
    } else {
      res.status(405).end();
    }
  } catch (error) {
    const finalError = error as CustomError;
    logger.error(finalError, 'Geocoding error:');
    res.status(finalError.statusCode).json(finalError);
  }
}
