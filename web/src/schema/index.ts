import * as yup from 'yup';

export const formInputPhoneSchema = yup
  .string()
  .required()
  .test('isBelgianNumber', 'Phone number is invalid', (value = '') => {
    return Boolean(value.startsWith('+32'));
  });

export const formInputPhoneSchemaOptional = yup
  .string()
  .optional()
  .test('isBelgianNumber', 'Phone number is invalid', (value = '') => {
    return !value || Boolean(value.startsWith('+32'));
  });
