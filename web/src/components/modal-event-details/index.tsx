import { Modal, ModalContact, TableContacts } from '@components';
import { RepeatEvent } from '@constants';
import { yupResolver } from '@hookform/resolvers/yup';
import { IModalEventDetails } from '@interfaces';
import { TextField, Tooltip } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import Autocomplete from 'react-google-autocomplete';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useModal } from 'src/hooks/useModal';
import { mutate } from 'swr';
import * as yup from 'yup';

const eventSchema = yup.object({
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
  startTimeValue: yup.date().required(),
  endTimeValue: yup.date().required(),
  title: yup.string().required(),
  repeat: yup.string().oneOf(Object.values(RepeatEvent)),
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

type IFormCalendarEvent = yup.InferType<typeof eventSchema>;

export const ModalEventDetails: React.FC<IModalEventDetails> = ({
  caretakers,
  externalContacts,
  fetchCalendarEvents,
  plwd,
  selectedEvent,
  setSelectedEvent,
}) => {
  const { enqueueSnackbar } = useSnackbar();
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
  const defaultContacts = [...caretakersForForm, ...externalContactsForForm];
  const {
    control,
    formState: { errors },
    getValues,
    handleSubmit,
    register,
    watch,
  } = useForm<IFormCalendarEvent>({
    defaultValues: {
      contacts: defaultContacts,
      address: selectedEvent.extendedProps?.address,
      endTimeValue: selectedEvent.end || dayjs().toDate(),
      // pickedUp: selectedEvent.extendedProps?.pickedUp,
      repeat: selectedEvent.extendedProps?.repeat || RepeatEvent.NEVER,
      startTimeValue: selectedEvent.start || dayjs().toDate(),
      title: selectedEvent.title,
    },
    resolver: yupResolver(eventSchema),
  });

  const { fields, append } = useFieldArray<IFormCalendarEvent>({
    name: 'contacts',
    control,
  });

  const [isLoading, setLoading] = useState(false);
  const { isVisible, open, close } = useModal();
  const watchStartTime = watch('startTimeValue');

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

  const onSubmit = (data: IFormCalendarEvent) => {
    const carecircleMemberIds: any = data.contacts
      .filter((c) => c.checked && c.caretakerId)
      .map((c) => c.caretakerId);

    const externalContactIds = data.contacts
      .filter((c) => c.checked && c.externalContactId)
      .map((c) => c.externalContactId);

    const newEvent = {
      ...(selectedEvent.id && { id: selectedEvent.id }),
      address: data.address,
      carecircleMemberIds,
      externalContactIds,
      endTime: data.endTimeValue,
      // pickedUp: data.pickedUp,
      plwdId: plwd.id,
      repeat: data.repeat,
      startTime: data.startTimeValue,
      title: data.title,
    };
    const reqMethod = newEvent.id ? 'PATCH' : 'POST';
    setLoading(true);
    fetch(`/api/calendar-event/${plwd.id}`, {
      method: reqMethod,
      body: JSON.stringify(newEvent),
    }).then(() => {
      setLoading(false);
      fetchCalendarEvents();
      refetchExternalContacts();
      enqueueSnackbar('Updated', {
        variant: 'success',
      });
      onClose();
    });
  };

  const deleteCalendarEvent = (eventId: string) => {
    setLoading(true);
    fetch(`/api/calendar-event/${plwd.id}/${eventId}`, {
      method: 'DELETE',
    }).then(() => {
      setLoading(false);
      fetchCalendarEvents();
      enqueueSnackbar('Deleted', {
        variant: 'success',
      });
      onClose();
    });
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

  return (
    <div>
      <Modal boxClassName="max-w-5xl" onSubmit={handleSubmit(onSubmit)}>
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
            <input
              {...register('title', { required: true })}
              className={`input input-bordered w-full ${
                errors.title ? 'input-error' : ''
              }`}
              placeholder="What is the event about"
              type="text"
            />
          </div>
          <div className="form-control w-full">
            <label className="label">
              <span
                className={`label-text ${errors.address ? 'text-error' : ''}`}
              >
                Add a destination*
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
          {/* <div className="form-control max-w-[180px] mt-2">
            <label className="label cursor-pointer">
              <span className="label-text">Getting picked up</span>
              <input
                {...register('pickedUp')}
                className="toggle toggle-secondary"
                type="checkbox"
              />
            </label>
          </div> */}
          <div>
            <div className="flex">
              <div className="mr-4">
                <label className="label">
                  <span className="label-text">Start time</span>
                </label>
                <Controller
                  control={control}
                  name="startTimeValue"
                  render={({ field: { value, onChange } }) => (
                    <DateTimePicker
                      disablePast
                      disabled={
                        selectedEvent.id &&
                        dayjs(getValues('startTimeValue')).isBefore(new Date())
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
                  <span className="label-text">End time</span>
                </label>
                <Controller
                  control={control}
                  name="endTimeValue"
                  render={({ field: { value, onChange } }) => (
                    <DateTimePicker
                      disablePast
                      disabled={
                        selectedEvent.id &&
                        dayjs(getValues('endTimeValue')).isBefore(new Date())
                      }
                      onChange={onChange}
                      renderInput={(props) => <TextField {...props} />}
                      value={value}
                    />
                  )}
                />
              </div>
            </div>
            {!hasErrors && isEventNightTime ? (
              <p className="text-warning mt-2">
                Warning: Your event starts before 7am or after 8pm
              </p>
            ) : null}
          </div>
          {/* <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Repeat</span>
            </label>
            <Controller
              control={control}
              name="repeat"
              render={({ field: { value, onChange } }) => (
                <select
                  className="select select-bordered"
                  onChange={onChange}
                  value={value}
                >
                  {Object.values(RepeatEvent).map((text) => (
                    <option key={text}>{text}</option>
                  ))}
                </select>
              )}
            />
          </div> */}
          <div className="form-control w-full">
            <label className="label">
              <Tooltip title="The contact who will receive a notification in case of emergency (eg: The person with dementia seems lost).">
                <span className="label-text flex">
                  Contact Persons
                  <svg
                    className="h-5 w-5 ml-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      clipRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      fillRule="evenodd"
                    />
                  </svg>
                </span>
              </Tooltip>
            </label>
            <div className="flex">
              <button className="btn w-32 mb-4" onClick={open} type="button">
                Add new
              </button>
            </div>
          </div>
        </div>
        <TableContacts fields={fields} register={register} />
        <div className="modal-action items-center">
          {hasErrors ? (
            <p className="text-error">Please complete all required fields</p>
          ) : null}
          {selectedEvent.id && (
            <button
              className="btn btn-error"
              onClick={() => {
                deleteCalendarEvent(selectedEvent.id);
                onClose();
              }}
              type="button"
            >
              Delete
            </button>
          )}
          <button className="btn" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className={`btn btn-secondary ${isLoading ? 'btn-loading' : ''}`}
            type="submit"
          >
            {selectedEvent.id ? 'Update' : 'Add'}
          </button>
        </div>
      </Modal>
      {isVisible ? (
        <ModalContact
          getUsers={refetchCarecircle}
          onClose={close}
          onSuccess={onSuccess}
          selectedContact={{}}
          showAddUserToCarecircleToggle
        />
      ) : null}
    </div>
  );
};
