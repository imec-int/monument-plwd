import { isValidPhoneNumber } from 'react-phone-number-input';
import * as yup from 'yup';

export const formInputPhoneSchema = yup
  .string()
  .required()
  .test('isBelgianNumber', 'Phone number is invalid', (value = '') => {
    return isValidPhoneNumber(value, { defaultCountry: 'BE' }); // TODO: how can we support multiple/dynamic countries?
  });

export const formInputPhoneSchemaOptional = yup
  .string()
  .optional()
  .nullable()
  .test('isBelgianNumber', 'Phone number is invalid', (value = '') => {
    return !value || isValidPhoneNumber(value, { defaultCountry: 'BE' }); // TODO: how can we support multiple/dynamic countries?
  });
