import { formInputPhoneSchemaOptional } from '@schema';
import * as yup from 'yup';

export const usePlwdValidationSchema = () => {
  return yup.object({
    firstName: yup.string().required(),
    lastName: yup.string().required(),
    phone: formInputPhoneSchemaOptional,
    email: yup.string().email(),
    picture: yup.string(),
    address: yup.object({
      description: yup.string(),
      geometry: yup.object({
        location: yup.object({
          lat: yup.number().required(),
          lng: yup.number().required(),
        }),
      }),
    }),
    watchId: yup.string().optional(),
  });
};
