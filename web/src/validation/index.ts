import * as yup from 'yup';

export const pictureValidationSchema = yup
  .string()
  .nullable()
  .test(
    'exceedsAllowedLimit',
    'Image size is too large, maximum allowed size is 600kb',
    (value) => {
      if (!value) return true;

      return value.length < 900000;
    }
  );
