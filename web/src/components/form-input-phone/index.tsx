import 'react-phone-number-input/style.css';

import { Controller } from 'react-hook-form';
import PhoneInput from 'react-phone-number-input';

interface IFormInputPhone {
  control: any;
  errors: any;
  name?: string;
  required?: boolean;
}

export const FormInputPhone: React.FC<IFormInputPhone> = ({
  control,
  errors,
  name = 'phone',
  required = false,
}) => {
  return (
    <div className="form-control w-full">
      <label className="label">
        <span className="label-text">Phone{required ? '*' : ''}</span>
      </label>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange } }) => (
          <div className="input input-bordered w-full flex">
            <PhoneInput
              addInternationalOption={false}
              className="w-full"
              countries={['BE']}
              defaultCountry="BE"
              onChange={onChange}
              placeholder="Enter phone number"
              value={value}
            />
          </div>
        )}
      />
      {errors.phone ? (
        <label className="label">
          <span className="label-text-alt text-error">
            {errors.phone.message}
          </span>
        </label>
      ) : null}
    </div>
  );
};
