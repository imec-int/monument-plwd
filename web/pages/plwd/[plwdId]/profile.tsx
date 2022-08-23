import { withPageAuthRequired } from '@auth0/nextjs-auth0';
import {
  Container,
  FormInputPhone,
  Header,
  ImageSetterController,
} from '@components';
import { LayoutWithAppContext } from '@components/layouts/LayoutWithAppContext';
import { UserRole } from '@enum';
import { yupResolver } from '@hookform/resolvers/yup';
import { CustomError } from 'lib/CustomError';
import { fetchWrapper } from 'lib/fetch';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';
import { ReactElement, useEffect } from 'react';
import Autocomplete from 'react-google-autocomplete';
import { Controller, useForm } from 'react-hook-form';
import { useAppUserContext } from 'src/hooks/useAppUserContext';
import { usePermissions } from 'src/hooks/usePermissions';
import { usePlwdValidationSchema } from 'src/hooks/usePlwdValidationSchema';
import { useUserValidationSchema } from 'src/hooks/useUserValidationSchema';
import * as yup from 'yup';

type IFormPlwdInfo = yup.InferType<ReturnType<typeof usePlwdValidationSchema>>;
type IFormUserInfo = yup.InferType<ReturnType<typeof useUserValidationSchema>>;

export const getServerSideProps = withPageAuthRequired();

const Profile = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { user, plwd } = useAppUserContext();
  const { canManageCarecircle } = usePermissions();
  const router = useRouter();
  const plwdInfoSchema = usePlwdValidationSchema();
  const userInfoSchema = useUserValidationSchema();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<IFormPlwdInfo>({
    defaultValues: {
      address: plwd.address,
      picture: plwd.picture,
      email: plwd.email,
      firstName: plwd.firstName,
      lastName: plwd.lastName,
      phone: plwd.phone,
      watchId: plwd.watchId,
    },
    resolver: yupResolver(plwdInfoSchema),
  });

  const {
    register: registerUser,
    handleSubmit: handleSubmitUser,
    control: controlUser,
    formState: { errors: errorsUser, isSubmitting: isSubmittingUser },
  } = useForm<IFormUserInfo>({
    defaultValues: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      picture: user.picture,
    },
    resolver: yupResolver(userInfoSchema),
  });

  const onSubmitUser = async (data: IFormUserInfo) => {
    const updatedUser = {
      ...data,
      email: user.email,
      id: user.id,
      auth0Id: user.auth0Id,
      role: user.role,
    };
    try {
      await fetchWrapper(`/api/user/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ user: updatedUser }),
      });
      enqueueSnackbar(
        `Successfully updated User ${data.firstName} ${data.lastName}!`,
        {
          variant: 'success',
        }
      );
    } catch (error) {
      const _error = error as CustomError;
      enqueueSnackbar(`Failed to update User: ${_error}`, {
        variant: 'error',
      });
    }
  };

  const onSubmit = async (data: IFormPlwdInfo) => {
    try {
      const updatedUser = {
        ...data,
        caretakerId: plwd.caretakerId,
        id: plwd.id,
      };

      await fetchWrapper(`/api/plwd/${updatedUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updatedUser),
      });

      enqueueSnackbar(
        `Successfully updated PLWD ${data.firstName} ${data.lastName}!`,
        {
          variant: 'success',
        }
      );
    } catch (error) {
      const _error = error as CustomError;
      enqueueSnackbar(`Failed to update PLWD: ${_error}`, {
        variant: 'error',
      });
    }
  };

  useEffect(() => {
    if (!canManageCarecircle) {
      router.push(`/plwd/${plwd.id}`);
    }
  }, [canManageCarecircle, router, plwd.id]);

  if (!canManageCarecircle) return null;

  const role =
    plwd.caretakerId === user.id ? (
      <p>Primary Caretaker</p>
    ) : (
      <p>{user.role === UserRole.ADMIN ? 'Admin' : 'Carecircle member'}</p>
    );

  return (
    <Container>
      <Header tabTitle="Monument - Profile" />
      <div className="m-auto flex gap-4">
        <form
          className="card p-8 bg-base-100 shadow-xl my-8 flex flex-column content-end"
          onSubmit={handleSubmitUser(onSubmitUser)}
        >
          <div className="flex-1">
            <h2 className="card-title mb-2 mt-8">User Info ({role})</h2>
            <div className="mt-2">
              <ImageSetterController control={controlUser} name="picture" />
            </div>
            <div className="form-control w-full mt-2">
              <label className="label">
                <span className="label-text">First Name</span>
              </label>
              <input
                {...registerUser('firstName', { required: true })}
                className={`input input-bordered w-96 ${
                  errors.firstName ? 'input-error' : ''
                }`}
                placeholder="First Name"
                type="text"
              />
            </div>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Last Name</span>
              </label>
              <input
                {...registerUser('lastName', { required: true })}
                className={`input input-bordered w-96 ${
                  errors.lastName ? 'input-error' : ''
                }`}
                placeholder="Last Name"
                type="text"
              />
            </div>
            <FormInputPhone control={controlUser} errors={errorsUser} />
            <div className="form-control w-full mt-2">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                {...registerUser('email', { required: true })}
                className={`input input-bordered w-96 ${
                  errors.email ? 'input-error' : ''
                }`}
                disabled
                placeholder="Email"
                type="text"
              />
            </div>
          </div>
          <button
            className={`w-40 m-auto mt-4 block btn btn-secondary${
              isSubmitting ? ' loading' : ''
            }`}
            type="submit"
          >
            Save
          </button>
        </form>
        <form
          className="card p-8 bg-base-100 shadow-xl my-8"
          onSubmit={handleSubmit(onSubmit)}
        >
          <h2 className="card-title mb-2 mt-8">PLWD Info</h2>
          <div className="mt-2">
            <ImageSetterController control={control} name="picture" />
          </div>
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">First Name</span>
            </label>
            <input
              {...register('firstName', { required: true })}
              className={`input input-bordered w-96 ${
                errors.firstName ? 'input-error' : ''
              }`}
              placeholder="First Name"
              type="text"
            />
          </div>
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Last Name</span>
            </label>
            <input
              {...register('lastName', { required: true })}
              className={`input input-bordered w-96 ${
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
              className={`input input-bordered w-96 ${
                errors.email ? 'input-error' : ''
              }`}
              placeholder="Email"
              type="text"
            />
          </div>
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">IMEI / Watch ID</span>
            </label>
            <input
              {...register('watchId')}
              className={`input input-bordered w-96 ${
                errors.watchId ? 'input-error' : ''
              }`}
              placeholder="IMEI / Watch ID"
              type="text"
            />
          </div>
          <div className="form-control w-full mb-8">
            <label className="label">
              <span className="label-text">Address</span>
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
                  onPlaceSelected={(place) => {
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
                  placeholder="Enter address"
                />
              )}
              rules={{ required: true }}
            />
          </div>
          <button
            className={`w-40 m-auto btn btn-secondary${
              isSubmitting ? ' loading' : ''
            }`}
            type="submit"
          >
            Save
          </button>
        </form>
      </div>
    </Container>
  );
};

Profile.getLayout = function getLayout(page: ReactElement) {
  return <LayoutWithAppContext>{page}</LayoutWithAppContext>;
};

export default Profile;
