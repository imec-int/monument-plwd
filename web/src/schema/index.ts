import * as yup from 'yup';

export const formInputPhoneSchema = yup
  .string()
  .required()
  .test('isBelgianNumber', 'Phone number is invalid', (value) => {
    return Boolean(value?.startsWith('+32'));
  });
