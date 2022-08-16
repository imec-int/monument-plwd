import 'react-phone-number-input/style.css';

import { Container, FormInputPhone, ImageSetterController } from '@components';
import { yupResolver } from '@hookform/resolvers/yup';
import { ISetupStep } from '@interfaces';
import { CustomError } from 'lib/CustomError';
import { fetchWrapper } from 'lib/fetch';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import Autocomplete from 'react-google-autocomplete';
import { Controller, useForm } from 'react-hook-form';
import { usePlwdValidationSchema } from 'src/hooks/usePlwdValidationSchema';
import * as yup from 'yup';

type IFormPlwdInfo = yup.InferType<ReturnType<typeof usePlwdValidationSchema>>;

export const SetupStep2: React.FC<ISetupStep> = ({ nextStep, userData }) => {
  const plwdInfoSchema = usePlwdValidationSchema();
  const [isLoading, setIsLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<IFormPlwdInfo>({
    defaultValues: {},
    resolver: yupResolver(plwdInfoSchema),
  });

  const onSubmit = async (data: IFormPlwdInfo) => {
    setIsLoading(true);

    const newUser = {
      ...data,
      caretakerId: userData.currentUser.id,
    };
    fetchWrapper('/api/plwd', {
      method: 'POST',
      body: JSON.stringify(newUser),
    })
      .then(() => {
        enqueueSnackbar(`Created PLWD ${data.firstName} ${data.lastName}`, {
          variant: 'success',
        });
        nextStep();
      })
      .catch((error: CustomError) => {
        enqueueSnackbar(`Failed to create PLWD: ${error.toString()}`, {
          variant: 'error',
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <Container>
      <form
        className="card m-auto w-[32rem] text-center p-8 bg-base-100 shadow-xl my-8 overflow-scroll"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="m-auto">
          <svg
            className="h-8 w-8"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="card-title text-center mt-4 m-auto">
          Details person living with dementia
        </h2>
        <p className="my-4">
          Now we need to know more about
          <br />
          the person living with dementia
        </p>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">First Name*</span>
          </label>
          <input
            {...register('firstName', { required: true })}
            className={`input input-bordered w-full ${
              errors.firstName ? 'input-error' : ''
            }`}
            placeholder="First Name"
            type="text"
          />
        </div>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Last Name*</span>
          </label>
          <input
            {...register('lastName', { required: true })}
            className={`input input-bordered w-full ${
              errors.lastName ? 'input-error' : ''
            }`}
            placeholder="First Name"
            type="text"
          />
        </div>
        <FormInputPhone control={control} errors={errors} />
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Email</span>
          </label>
          <input
            {...register('email', { required: true })}
            className={`input input-bordered w-full ${
              errors.email ? 'input-error' : ''
            }`}
            placeholder="Email"
            type="text"
          />
        </div>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Address*</span>
          </label>
          <Controller
            control={control}
            name="address"
            render={({ field: { value, onChange } }) => (
              <Autocomplete
                apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                className={`input input-bordered w-full ${
                  errors.address ? 'input-error' : ''
                }`}
                defaultValue={value?.description}
                language="en"
                onPlaceSelected={(place: any) => {
                  onChange({
                    description: place.formatted_address,
                    geometry: {
                      location: {
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                      },
                    },
                  });
                }}
                options={{
                  types: ['address'],
                }}
              />
            )}
            rules={{ required: true }}
          />
        </div>
        <div className="mt-2">
          <ImageSetterController control={control} name="picture" />
        </div>
        <button
          className={`w-40 mt-8 m-auto btn btn-secondary ${
            isLoading ? 'btn-loading' : ''
          }`}
          type="submit"
        >
          Continue
        </button>
      </form>
    </Container>
  );
};
