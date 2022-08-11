import { formInputPhoneSchema } from '@schema';
import * as yup from 'yup';

export const usePlwdValidationSchema = () => {
  return yup.object({
    firstName: yup.string().required(),
    lastName: yup.string().required(),
    phone: formInputPhoneSchema,
    email: yup.string().email().required(),
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
  });
};
