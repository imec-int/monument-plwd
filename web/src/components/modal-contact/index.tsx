import 'react-phone-number-input/style.css';

import {
  FormInputPhone,
  ImageSetterController,
  Modal,
  ModalActions,
  ModalAffiliation,
} from '@components';
import { Affiliation } from '@constants';
import { yupResolver } from '@hookform/resolvers/yup';
import { IAffiliation, ICarecircleMember } from '@interfaces';
import { EmptyIUser } from '@interfaces';
import { Tooltip } from '@mui/material';
import { formInputPhoneSchema } from '@schema';
import { CustomError } from 'lib/CustomError';
import { fetchWrapper } from 'lib/fetch';
import { useSnackbar } from 'notistack';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useAffiliations } from 'src/hooks/useAffiliations';
import { useAppUserContext } from 'src/hooks/useAppUserContext';
import { pictureValidationSchema } from 'src/validation';
import * as yup from 'yup';

const userSchema = yup.object({
  addUserToCarecircle: yup.boolean().required(),
  firstName: yup.string().required(),
  lastName: yup.string().required(),
  phone: formInputPhoneSchema,
  picture: pictureValidationSchema,
  affiliation: yup.string().required(),
  email: yup.string().email().required(),
  id: yup.string(),
  locationPermission: yup.string().required(),
  carecirclePermission: yup.string().required(),
  calendarPermission: yup.string().required(),
});

// Create a new affiliation const from affiliation properties and filter PRIMARY_CARETAKER
const ContactAffiliations = Object.values(Affiliation).filter(
  (a) => a !== Affiliation.PRIMARY_CARETAKER
);

const locationPermissions = {
  'when-assigned:locations': 'When assigned as contact person',
  'always:locations': 'Always',
};

const calendarPermissions = {
  'never:calendar': 'Never',
  'read:calendar': 'Read',
  'manage:calendar': 'Read and edit',
};

const carecirclePermissions = {
  'never:carecircle': 'Never',
  'read:carecircle': 'Read',
  'manage:carecircle': 'Read and edit',
};

const permissionOptions: Record<number, Record<string, string>> = {
  0: locationPermissions,
  1: calendarPermissions,
  2: carecirclePermissions,
};

const permissionLabels: Record<number, string> = {
  0: 'Access to location',
  1: 'Access to calendar',
  2: 'Access to carecircle',
};

type IUserSchema = yup.InferType<typeof userSchema>;

type IContactModalBase = {
  getUsers: () => Promise<void>;
  addAffiliation?: (affiliation: string) => Promise<void>;
  onClose: () => void;
  onError?: (err: Error) => Promise<void> | void;
  onSuccess?: (data: IUserSchema) => Promise<void> | void;
  showAddUserToCarecircleToggle?: boolean;
};

type IContactModal = IContactModalBase & {
  selectedContact: ICarecircleMember | EmptyIUser;
};
type IAddContactModal = IContactModalBase & { selectedContact: EmptyIUser };
type IEditContactModal = IContactModalBase & {
  selectedContact: ICarecircleMember;
};

const defaultValues = {
  affiliation: Affiliation.FAMILY,
};

export const ModalContact = (props: IContactModal) => {
  const { selectedContact } = props;
  const isEdit = Object.keys(selectedContact).length > 0;

  if (isEdit) {
    const _props = props as IEditContactModal;

    return <ModalContactEdit {..._props} />;
  }

  const _props = props as IAddContactModal;

  return <ModalContactAdd {..._props} />;
};

const mapPermissionsToValues = (permissions: string[]) => {
  return {
    locationPermission:
      permissions.find((p) => p.endsWith('locations')) ??
      'when-assigned:locations',
    calendarPermission:
      permissions.find((p) => p.endsWith('calendar')) ?? 'never:calendar',
    carecirclePermission:
      permissions.find((p) => p.endsWith('carecircle')) ?? 'never:carecircle',
  };
};

const ModalContactEdit = ({
  getUsers,
  onClose,
  onError,
  onSuccess,
  selectedContact,
}: IEditContactModal) => {
  const { enqueueSnackbar } = useSnackbar();
  const { plwd } = useAppUserContext();
  const { data: affiliations = [] } = useAffiliations(plwd.id);
  const [addAffliationOpen, setAddAffiliationOpen] = useState<boolean>(false);

  const permissions = useMemo(() => {
    if (selectedContact.permissions) {
      const contactPermissions = (selectedContact.permissions ??
        []) as string[];

      return mapPermissionsToValues(contactPermissions);
    }

    return mapPermissionsToValues([]);
  }, [selectedContact]);

  const contact = {
    ...selectedContact.user,
    affiliation: selectedContact.affiliation,
    permissions: undefined,
  };

  const availableAffiliations = useMemo(() => {
    const mappedAffiliations = affiliations.map(
      (a: IAffiliation) => a.affiliation
    );

    return [...mappedAffiliations, ...ContactAffiliations];
  }, [affiliations]);

  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<IUserSchema>({
    defaultValues: {
      addUserToCarecircle: true,
      ...defaultValues,
      ...contact,
      ...permissions,
    },
    resolver: yupResolver(userSchema),
  });

  const onSubmit = (data: IUserSchema) => {
    const {
      addUserToCarecircle,
      locationPermission,
      calendarPermission,
      carecirclePermission,
      affiliation,
      ...user
    } = data;

    const permissions = JSON.stringify([
      locationPermission,
      calendarPermission,
      carecirclePermission,
    ]);

    fetchWrapper(`/api/carecircle-members/${plwd.id}/${selectedContact.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        addUserToCarecircle,
        affiliation,
        permissions,
        user,
      }),
    })
      .then(async (data) => {
        await getUsers();
        if (onSuccess) {
          await onSuccess(data);
        }
        enqueueSnackbar(`Updated contact ${user.firstName} ${user.lastName}`, {
          variant: 'success',
        });
        onClose();
      })
      .catch(async (err) => {
        if (onError) {
          await onError(err);
        }
        enqueueSnackbar(
          `Failed to update contact ${user.firstName} ${user.lastName}`,
          {
            variant: 'error',
          }
        );
        onClose();
      });
  };

  return (
    <div>
      <Modal onSubmit={handleSubmit(onSubmit)}>
        <h3 className="font-bold text-lg">Edit contact</h3>
        <div className="w-full">
          <div className="flex w-full gap-4">
            <div className="form-control w-full flex-auto grow">
              <label className="label">
                <span className="label-text">First name*</span>
              </label>
              <input
                {...register('firstName', { required: true })}
                className={`input input-bordered w-full ${
                  errors.firstName ? 'input-error' : ''
                }`}
                placeholder="eg. Ana"
                type="text"
              />
            </div>
            <div className="form-control w-full flex-auto">
              <label className="label">
                <span className="label-text">Last name*</span>
              </label>
              <input
                {...register('lastName', { required: true })}
                className={`input input-bordered w-full ${
                  errors.lastName ? 'input-error' : ''
                }`}
                placeholder="eg. Wouters"
                type="text"
              />
            </div>
          </div>
          <div className="form-control w-full mt-2">
            <label className="label">
              <span className="label-text">Email*</span>
            </label>
            <input
              {...register('email', { required: true })}
              className={`input input-bordered w-full ${
                errors.email ? 'input-error' : ''
              }`}
              disabled
              placeholder="eg. ana.wouters@gmail.com"
              type="text"
            />
          </div>
          <div className="flex mt-2 gap-4 items-end">
            <FormInputPhone control={control} errors={errors} required />
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Affiliation</span>
              </label>
              <Controller
                control={control}
                name="affiliation"
                render={({ field: { value, onChange } }) => (
                  <select
                    className="select select-bordered"
                    onChange={onChange}
                    value={value}
                  >
                    {Object.values(availableAffiliations).map((text) => (
                      <option key={text}>{text}</option>
                    ))}
                  </select>
                )}
              />
            </div>
            <Tooltip title="Add a new affiliation">
              <div
                className="btn btn-square"
                onClick={() => setAddAffiliationOpen(true)}
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </Tooltip>
          </div>
          <div className="mt-2">
            <ImageSetterController control={control} name="picture" />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-2 w-full">
            <div className="form-control">
              <label className="label">
                <span className="label-text">{permissionLabels[0]}</span>
              </label>
              <select
                className="select select-bordered"
                {...register('locationPermission')}
              >
                {Object.entries(permissionOptions[0]).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">{permissionLabels[1]}</span>
              </label>
              <select
                className="select select-bordered"
                {...register('calendarPermission')}
              >
                {Object.entries(permissionOptions[1]).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">{permissionLabels[2]}</span>
              </label>
              <select
                className="select select-bordered"
                {...register('carecirclePermission')}
              >
                {Object.entries(permissionOptions[2]).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <ModalActions>
          <button className="btn" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="btn btn-secondary" type="submit">
            Save
          </button>
        </ModalActions>
      </Modal>
      {addAffliationOpen ? (
        <ModalAffiliation onClose={() => setAddAffiliationOpen(false)} />
      ) : null}
    </div>
  );
};

const ModalContactAdd = ({
  getUsers,
  onClose,
  onError,
  onSuccess,
  selectedContact,
  showAddUserToCarecircleToggle = false,
}: IAddContactModal) => {
  const { plwd } = useAppUserContext();
  const { enqueueSnackbar } = useSnackbar();
  const { data: affiliations = [] } = useAffiliations(plwd.id);

  const [addAffliationOpen, setAddAffiliationOpen] = useState<boolean>(false);

  const permissions = useMemo(() => {
    if (selectedContact.permissions) {
      const contactPermissions = (selectedContact.permissions ??
        []) as string[];

      return mapPermissionsToValues(contactPermissions);
    }

    return mapPermissionsToValues([]);
  }, [selectedContact]);

  const contact = {
    ...selectedContact,
    permissions: undefined,
  };

  const availableAffiliations = useMemo(() => {
    const mappedAffiliations = affiliations.map(
      (a: IAffiliation) => a.affiliation
    );

    return [...mappedAffiliations, ...ContactAffiliations];
  }, [affiliations]);

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
    watch,
  } = useForm<IUserSchema>({
    defaultValues: {
      addUserToCarecircle: !showAddUserToCarecircleToggle,
      ...defaultValues,
      ...contact,
      ...permissions,
    },
    resolver: yupResolver(userSchema),
  });

  const carecircleToggleIsActive = watch('addUserToCarecircle');

  const onSubmit = (data: IUserSchema) => {
    const {
      addUserToCarecircle,
      locationPermission,
      calendarPermission,
      carecirclePermission,
      affiliation,
      ...user
    } = data;
    const permissions = JSON.stringify([
      locationPermission,
      calendarPermission,
      carecirclePermission,
    ]);
    const url = addUserToCarecircle
      ? `/api/carecircle-members/${plwd.id}`
      : `/api/external-contact/${plwd.id}`;

    const body = addUserToCarecircle
      ? {
          addUserToCarecircle,
          user,
          affiliation,
          permissions,
        }
      : {
          ...user,
          affiliation,
          permissions,
          plwdId: plwd.id,
        };

    fetchWrapper(url, {
      method: 'POST',
      body: JSON.stringify(body),
    })
      .then(async (response) => {
        await getUsers();
        if (onSuccess) {
          await onSuccess({ ...response, addUserToCarecircle });
        }
        enqueueSnackbar(`Created contact ${data.firstName} ${data.lastName}`, {
          variant: 'success',
        });
        onClose();
      })
      .catch(async (err: CustomError) => {
        if (err.statusCode === 409) {
          if (err.text.includes('[existing-email]')) {
            setError('email', {
              type: 'custom',
              message: 'Email already exists',
            });
          } else if (err.text.includes('[existing-phone]')) {
            setError('phone', {
              type: 'custom',
              message: 'Phone already exists',
            });
          } else if (err.text.includes('[carecircle-member-conflict]')) {
            setError('email', {
              type: 'custom',
              message: 'This account is already part of the carecircle',
            });
          } else if (err.text.includes('[phone-email-conflict]')) {
            setError('phone', {
              type: 'custom',
              message: 'A different phone is already linked to this account',
            });
          }

          return;
        }

        if (onError) {
          await onError(err);
        }
        enqueueSnackbar(
          `Failed to create contact ${data.firstName} ${data.lastName}`,
          {
            variant: 'error',
          }
        );
        onClose();
      });
  };

  return (
    <div>
      <Modal onSubmit={handleSubmit(onSubmit)}>
        <h3 className="font-bold text-lg">Add a new contact</h3>
        <div className="w-full">
          <div className="flex w-full gap-4">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">First name*</span>
              </label>
              <input
                {...register('firstName', { required: true })}
                className={`input input-bordered w-full ${
                  errors.firstName ? 'input-error' : ''
                }`}
                placeholder="eg. Ana"
                type="text"
              />
            </div>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Last name*</span>
              </label>
              <input
                {...register('lastName', { required: true })}
                className={`input input-bordered w-full ${
                  errors.lastName ? 'input-error' : ''
                }`}
                placeholder="eg. Wouters"
                type="text"
              />
            </div>
          </div>
          <div className="form-control w-full mt-2">
            <label className="label">
              <span className="label-text">Email*</span>
            </label>
            <input
              {...register('email', { required: true })}
              className={`input input-bordered w-full ${
                errors.email ? 'input-error' : ''
              }`}
              placeholder="eg. ana.wouters@gmail.com"
              type="text"
            />
            {errors.email ? (
              <label className="label">
                <span className="label-text-alt text-error">
                  {errors.email.message}
                </span>
              </label>
            ) : null}
          </div>
          <FormInputPhone control={control} errors={errors} />
          <div className="flex mt-2 gap-4 items-end">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Affiliation</span>
              </label>
              <div className="w-full">
                <Controller
                  control={control}
                  name="affiliation"
                  render={({ field: { value, onChange } }) => (
                    <select
                      className="select select-bordered w-full"
                      onChange={onChange}
                      value={value}
                    >
                      {Object.values(availableAffiliations).map((text) => (
                        <option key={text}>{text}</option>
                      ))}
                    </select>
                  )}
                />
              </div>
            </div>
            <Tooltip title="Add a new affiliation">
              <div
                className="btn btn-square"
                onClick={() => setAddAffiliationOpen(true)}
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </Tooltip>
          </div>
          <div className="flex items-end">
            <div className="mt-2 flex-1">
              <div className="max-w-[280px] overflow-hidden">
                <ImageSetterController control={control} name="picture" />
              </div>
            </div>
            {showAddUserToCarecircleToggle ? (
              <div className="flex mt-3">
                <div className="form-control">
                  <label className="cursor-pointer label pb-1">
                    <input
                      {...register('addUserToCarecircle')}
                      className="checkbox checkbox-secondary mr-2"
                      type="checkbox"
                    />
                    <span className="label-text w-[110px]">
                      Add to carecircle
                    </span>
                  </label>
                </div>
              </div>
            ) : null}
          </div>
          {carecircleToggleIsActive ? (
            <div className="grid grid-cols-3 gap-4 mt-2 w-full">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">{permissionLabels[0]}</span>
                </label>
                <select
                  className="select select-bordered"
                  {...register('locationPermission')}
                >
                  {Object.entries(permissionOptions[0]).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">{permissionLabels[1]}</span>
                </label>
                <select
                  className="select select-bordered"
                  {...register('calendarPermission')}
                >
                  {Object.entries(permissionOptions[1]).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">{permissionLabels[2]}</span>
                </label>
                <select
                  className="select select-bordered"
                  {...register('carecirclePermission')}
                >
                  {Object.entries(permissionOptions[2]).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
        </div>
        <ModalActions>
          <button
            className={isSubmitting ? 'btn btn-disabled' : 'btn'}
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className={isSubmitting ? 'btn btn-disabled' : 'btn btn-secondary'}
            disabled={isSubmitting}
            type="submit"
          >
            Add
          </button>
        </ModalActions>
      </Modal>
      {addAffliationOpen ? (
        <ModalAffiliation onClose={() => setAddAffiliationOpen(false)} />
      ) : null}
    </div>
  );
};
