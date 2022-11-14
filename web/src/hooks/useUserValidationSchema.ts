import { formInputPhoneSchema } from '@schema';
import { validatePictureSchema } from 'src/validation';
import * as yup from 'yup';

export const useUserValidationSchema = () => {
  return yup.object({
    email: yup.string().email().required(),
    firstName: yup.string().required(),
    lastName: yup.string().required(),
    phone: formInputPhoneSchema,
    picture: validatePictureSchema,
  });
};
