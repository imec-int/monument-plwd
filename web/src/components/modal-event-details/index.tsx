import {
  Modal,
  ModalContact,
  ModalEventConfirm,
  ModalEventDelete,
  TableContacts,
} from '@components';
import { InfoIcon } from '@components/icons/InfoIcon';
import { RepeatEvent } from '@constants';
import { yupResolver } from '@hookform/resolvers/yup';
import { IEvent, IModalEventDetails } from '@interfaces';
import {
  Autocomplete as MuiAutocomplete,
  TextField,
  Tooltip,
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { CustomError } from 'lib/CustomError';
import { fetchWrapper } from 'lib/fetch';
import { useSnackbar } from 'notistack';
import { useEffect, useMemo } from 'react';
import Autocomplete from 'react-google-autocomplete';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useAppUserContext } from 'src/hooks/useAppUserContext';
import { useModal } from 'src/hooks/useModal';
import { mutate } from 'swr';
import * as yup from 'yup';

const eventSchema = yup.object({
  addADestination: yup.boolean().required(),
  contacts: yup
    .array(
      yup.object({
        firstName: yup.string(),
        checked: yup.boolean(),
        caretakerId: yup.string(),
        externalContactId: yup.string(),
      })
    )
    .required(),
  dateValue: yup.date().required(),
  startTimeValue: yup.date().required(),
  endTimeValue: yup
    .date()
    .required()
    .test(
      'endTimeIsInvalid',
      'End of the appointment should be after the start of the appointment',
      (value, context) => {
        if (value && context.parent.startTimeValue) {
          const { startTimeValue } = context.parent;
          const startTime =
            typeof startTimeValue === 'string'
              ? startTimeValue
              : startTimeValue.toISOString();

          return (
            dayjs(value).isAfter(startTime) || dayjs(value).isSame(startTime)
          );
        }

        return true;
      }
    ),
  title: yup.string().required(),
  repeat: yup.string().oneOf(Object.values(RepeatEvent)),
  address: yup
    .object({
      description: yup.string(),
      geometry: yup.object({
        location: yup.object({
          lat: yup.number().required(),
          lng: yup.number().required(),
        }),
      }),
    })
    .when('addADestination', {
      is: true,
      then: (schema) => schema.required(),
      otherwise: (schema) => schema.optional().nullable(),
    })
    .default(undefined),
});

type IFormCalendarEvent = yup.InferType<typeof eventSchema>;

export const ModalEventDetails: React.FC<IModalEventDetails> = ({
  caretakers,
  externalContacts,
  fetchCalendarEvents,
  plwd,
  selectedEvent,
  setSelectedEvent,
  allEvents,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAppUserContext();
  const selectedCaretakers = selectedEvent.extendedProps
    ? selectedEvent.extendedProps.caretakers
    : [];
  const selectedExternalContacts = selectedEvent.extendedProps
    ? selectedEvent.extendedProps.externalContacts
    : [];
  const caretakersForForm = caretakers.map((c) => ({
    ...c,
    caretakerId: c.id,
    checked: selectedCaretakers.includes(c.id),
  }));
  const externalContactsForForm = externalContacts.map((c) => ({
    ...c,
    externalContactId: c.id,
    checked: selectedExternalContacts.includes(c.id),
  }));
  // When there is no id yet, we assume we're in the creation mode of the modal
  const isCreating = !selectedEvent.id;
  // When creating an event we should check the current user as a contact person by default
  const caretakersContactsArray = isCreating
    ? caretakersForForm.map((c) => ({
        ...c,
        checked: c.user.id === user.id ? true : c.checked,
      }))
    : caretakersForForm;
  const defaultContacts = [
    ...caretakersContactsArray,
    ...externalContactsForForm,
  ];

  const nowAsDateObject = dayjs().toDate();
  const {
    control,
    formState: { errors, isSubmitting },
    getValues,
    handleSubmit,
    register,
    setValue,
    watch,
  } = useForm<IFormCalendarEvent>({
    defaultValues: {
      addADestination: Boolean(selectedEvent.extendedProps?.address),
      address: selectedEvent.extendedProps?.address,
      contacts: defaultContacts,
      dateValue:
        selectedEvent.extendedProps?.date ??
        selectedEvent.start ??
        nowAsDateObject,
      endTimeValue: selectedEvent.end ?? nowAsDateObject,
      // pickedUp: selectedEvent.extendedProps?.pickedUp,
      repeat: selectedEvent.extendedProps?.repeat || RepeatEvent.NEVER,
      startTimeValue: selectedEvent.start ?? nowAsDateObject,
      title: selectedEvent.title,
    },
    resolver: yupResolver(eventSchema),
  });

  const watchStartTime = watch('startTimeValue');
  const watchEndTime = watch('endTimeValue');
  const watchAddADestination = watch('addADestination');
  const watchDate = watch('dateValue');
  const watchTitle = watch('title');

  const titleOptions = useMemo(() => {
    const options = allEvents.map((e: IEvent) => {
      return {
        ...e,
        key: e.id,
        label: e.title,
      };
    });

    return options;
  }, [allEvents]);

  const { fields, append } = useFieldArray<IFormCalendarEvent>({
    name: 'contacts',
    control,
  });

  const {
    isVisible: isContactModalVisible,
    open: openContactModal,
    close: closeContactModal,
  } = useModal();
  const {
    isVisible: isDeleteModalVisible,
    open: openDeleteModal,
    close: closeDeleteModal,
  } = useModal();

  const {
    isVisible: isConfirmModalVisible,
    open: openConfirmModal,
    close: closeConfirmModal,
  } = useModal();

  const onClose = () => {
    setSelectedEvent(null);
  };

  const refetchCarecircle = async () => {
    await mutate(`/api/carecircle-members/${plwd.id}`);
  };

  const refetchExternalContacts = async () => {
    await mutate(`/api/external-contacts/${plwd.id}`);
  };

  const onSuccess = (newContact: any) => {
    const contact = {
      ...newContact,
      ...(newContact.addUserToCarecircle
        ? {
            caretakerId: newContact.id,
          }
        : {
            externalContactId: newContact.id,
          }),
      checked: true,
    };
    if (contact.caretakerId) {
      refetchCarecircle();
    } else {
      refetchExternalContacts();
    }
    append(contact);
  };

  const onSubmit = async (data: IFormCalendarEvent) => {
    try {
      const carecircleMemberIds = data.address
        ? data.contacts
            .filter((c) => c.checked && c.caretakerId)
            .map((c) => c.caretakerId)
        : [];

      const externalContactIds = data.address
        ? data.contacts
            .filter((c) => c.checked && c.externalContactId)
            .map((c) => c.externalContactId)
        : [];

      const event = {
        address: data.address ? data.address : null,
        carecircleMemberIds,
        externalContactIds,
        date: data.dateValue,
        endTime: data.endTimeValue,
        id: selectedEvent.id,
        // pickedUp: data.pickedUp,
        plwdId: plwd.id,
        repeat: data.repeat,
        startTime: data.startTimeValue,
        title: data.title,
      };

      const reqMethod = event.id ? 'PATCH' : 'POST';
      await fetchWrapper(`/api/calendar-event/${plwd.id}`, {
        method: reqMethod,
        body: JSON.stringify(event),
      });

      fetchCalendarEvents();
      refetchExternalContacts();
      onClose();

      enqueueSnackbar(
        `Successfully ${event.id ? 'updated' : 'created'} the event "${
          event.title
        }"`,
        {
          variant: 'success',
        }
      );
    } catch (error) {
      const _error = error as CustomError;
      enqueueSnackbar(
        `Failed to ${
          selectedEvent.id ? 'update' : 'create'
        } the event: ${_error}`,
        {
          variant: 'error',
        }
      );
    }
  };

  const onSubmitWithChecks = async (data: IFormCalendarEvent) => {
    if (data.address) {
      await onSubmit(data);
    } else {
      openConfirmModal();
    }
  };

  const hasErrors = Object.keys(errors).length > 0;
  const sevenAm = dayjs(watchStartTime)
    .set('hour', 7)
    .set('minute', 0)
    .set('second', 0);
  const eightPm = dayjs(watchStartTime)
    .set('hour', 20)
    .set('minute', 0)
    .set('second', 0);
  const isEventNightTime =
    dayjs(watchStartTime).isBefore(sevenAm) ||
    dayjs(watchStartTime).isAfter(eightPm);

  // update start and endtime when the date changes
  useEffect(() => {
    if (watchDate) {
      if (watchStartTime) {
        const startTime = dayjs(watchStartTime);
        const newStartTime = dayjs(watchDate)
          .hour(startTime.hour())
          .minute(startTime.minute())
          .second(startTime.second());
        setValue('startTimeValue', newStartTime.toDate());
      }

      if (watchEndTime) {
        const endTime = dayjs(watchEndTime);
        const newEndTime = dayjs(watchDate)
          .hour(endTime.hour())
          .minute(endTime.minute())
          .second(endTime.second());
        setValue('endTimeValue', newEndTime.toDate());
      }
    }
  }, [watchDate, setValue]); // eslint-disable-line

  const onTitleChange = (event: any, value: any) => {
    if (value) {
      const selectedEvent = allEvents.find((e) => e.id === value.id);
      if (selectedEvent) {
        const selectedEventAddress = selectedEvent?.address;
        setValue('startTimeValue', selectedEvent.startTime);
        setValue('endTimeValue', selectedEvent.endTime);
        if (selectedEventAddress) {
          const selectedEventContacts = defaultContacts.map((c: any) => {
            // go through selectedEvent.externalContacts to see if the current default conotact should be checked or not
            const selectedEventExternalContactExists =
              selectedEvent.externalContacts.find(
                (ec: any) => ec.id === c.externalContactId
              );
            const selectedEventCarecircleMemberExists =
              selectedEvent.carecircleMembers.find(
                (ec: any) => ec.id === c.caretakerId
              );

            return {
              ...c,
              checked:
                !!selectedEventExternalContactExists ||
                !!selectedEventCarecircleMemberExists,
            };
          });
          setValue('addADestination', true);
          setValue('address', selectedEventAddress);
          setValue('contacts', selectedEventContacts);
        }
      }
    }
  };

  return (
    <div>
      <Modal
        boxClassName="max-w-5xl"
        onSubmit={handleSubmit(onSubmitWithChecks)}
      >
        <h3 className="font-bold text-lg">Event Details</h3>
        <div className="w-full">
          <div className="form-control w-full">
            <label className="label">
              <span
                className={`label-text ${errors.title ? 'text-error' : ''}`}
              >
                Add a title*
              </span>
            </label>
            <MuiAutocomplete
              className="w-full"
              freeSolo
              id="title"
              onChange={onTitleChange}
              options={titleOptions}
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  {...register('title', { required: true })}
                  placeholder="What is the event about"
                />
              )}
              value={watchTitle}
            />
          </div>
          <div className="flex">
            <div className="mr-4">
              <label className="label">
                <span className="label-text">Date*</span>
              </label>
              <Controller
                control={control}
                name="dateValue"
                render={({ field: { value, onChange } }) => (
                  <DatePicker
                    disablePast
                    disabled={
                      selectedEvent.id &&
                      dayjs(getValues('startTimeValue')).isBefore(
                        nowAsDateObject
                      )
                    }
                    onChange={onChange}
                    renderInput={(props) => <TextField {...props} />}
                    value={value}
                  />
                )}
              />
            </div>
          </div>
          <div>
            <div className="flex">
              <div className="mr-4">
                <label className="label">
                  <span className="label-text">Start of the appointment*</span>
                </label>
                <Controller
                  control={control}
                  name="startTimeValue"
                  render={({ field: { value, onChange } }) => (
                    <TimePicker
                      ampm={false}
                      disabled={
                        selectedEvent.id &&
                        dayjs(getValues('startTimeValue')).isBefore(
                          nowAsDateObject
                        )
                      }
                      onChange={onChange}
                      renderInput={(props) => <TextField {...props} />}
                      value={value}
                    />
                  )}
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">End of the appointment*</span>
                </label>
                <Controller
                  control={control}
                  name="endTimeValue"
                  render={({ field: { value, onChange } }) => (
                    <TimePicker
                      ampm={false}
                      disabled={
                        selectedEvent.id &&
                        dayjs(getValues('endTimeValue')).isBefore(
                          nowAsDateObject
                        )
                      }
                      onChange={onChange}
                      renderInput={(props) => <TextField {...props} />}
                      value={value}
                    />
                  )}
                />
              </div>
            </div>
            {errors.endTimeValue ? (
              <p className="label-text-alt text-error mt-2">
                {errors.endTimeValue.message}
              </p>
            ) : null}
            {!hasErrors && isEventNightTime ? (
              <p className="text-warning mt-2">
                Warning: Your event starts before 7am or after 8pm
              </p>
            ) : null}
          </div>
          <>
            <div className="form-control w-full">
              <label className="label">
                <span
                  className={`label-text ${errors.address ? 'text-error' : ''}`}
                >
                  Destination
                </span>
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
                    placeholder="Search address"
                  />
                )}
              />
              <div className="form-control w-full">
                <p className="text-md mt-6 mb-4">
                  Who should get a notification when&nbsp;{' '}
                  <strong>
                    {plwd.firstName} {plwd.lastName}
                  </strong>{' '}
                  &nbsp;is late for the appointment ?
                </p>
                <div className="flex">
                  <button
                    className="btn w-32 mb-4"
                    onClick={openContactModal}
                    type="button"
                  >
                    Add new
                  </button>
                </div>
              </div>
            </div>
            <TableContacts fields={fields} register={register} />
          </>
        </div>
        <div className="modal-action items-center">
          {hasErrors ? (
            <p className="text-error">Please complete all required fields</p>
          ) : null}
          {selectedEvent.id && (
            <button
              className="btn btn-error"
              onClick={openDeleteModal}
              type="button"
            >
              Delete
            </button>
          )}
          <button className="btn" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className={`btn btn-secondary${isSubmitting ? ' loading' : ''}`}
            type="submit"
          >
            {selectedEvent.id ? 'Update' : 'Add'}
          </button>
        </div>
      </Modal>
      {isContactModalVisible ? (
        <ModalContact
          getUsers={refetchCarecircle}
          onClose={closeContactModal}
          onSuccess={onSuccess}
          selectedContact={{}}
          showAddUserToCarecircleToggle
        />
      ) : null}
      {isDeleteModalVisible ? (
        <ModalEventDelete
          closeDetailsModal={onClose}
          eventId={selectedEvent.id}
          eventTitle={selectedEvent.title}
          onClose={closeDeleteModal}
          plwdId={plwd.id}
          refetch={fetchCalendarEvents}
        />
      ) : null}
      {isConfirmModalVisible ? (
        <ModalEventConfirm
          onClose={closeConfirmModal}
          onSubmit={handleSubmit(onSubmit)}
        />
      ) : null}
    </div>
  );
};
