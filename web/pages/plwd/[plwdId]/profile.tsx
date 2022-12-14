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
import { useSnackbar } from 'notistack';
import { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { useAppUserContext } from 'src/hooks/useAppUserContext';
import { useUserValidationSchema } from 'src/hooks/useUserValidationSchema';
import { useSWRConfig } from 'swr';
import * as yup from 'yup';

type IFormUserInfo = yup.InferType<ReturnType<typeof useUserValidationSchema>>;

export const getServerSideProps = withPageAuthRequired();

const Profile = () => {
  const { mutate } = useSWRConfig();
  const { enqueueSnackbar } = useSnackbar();
  const { user, plwd } = useAppUserContext();
  const userInfoSchema = useUserValidationSchema();

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
      await mutate(`/api/user/${user.auth0Id}`);
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

  const role =
    plwd.caretakerId === user.id
      ? 'Primary Caretaker'
      : user.role === UserRole.ADMIN
      ? 'Admin'
      : 'Carecircle member';

  return (
    <Container>
      <Header tabTitle="Monument - Profile" />
      <div className="m-auto flex gap-4 w-full max-w-lg">
        <form
          className="card p-8 bg-base-100 shadow-xl my-8 flex flex-column content-end w-full"
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
                className={`input input-bordered w-full ${
                  errorsUser.firstName ? 'input-error' : ''
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
                className={`input input-bordered w-full ${
                  errorsUser.lastName ? 'input-error' : ''
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
                className={`input input-bordered w-full ${
                  errorsUser.email ? 'input-error' : ''
                }`}
                disabled
                placeholder="Email"
                type="text"
              />
            </div>
          </div>
          <button
            className={`w-40 m-auto mt-4 btn btn-secondary${
              isSubmittingUser ? ' loading' : ''
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
