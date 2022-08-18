import { CustomError } from 'lib/CustomError';
import { fetchWrapper } from 'lib/fetch';
import { useSnackbar } from 'notistack';
import { useForm } from 'react-hook-form';

import { Modal } from '..';

type Props = {
  closeDetailsModal: () => void;
  eventId: string;
  eventTitle: string;
  onClose: () => void;
  plwdId: string;
  refetch: () => void;
};

export const ModalEventDelete = ({
  closeDetailsModal,
  eventId,
  eventTitle,
  onClose,
  plwdId,
  refetch,
}: Props) => {
  const { enqueueSnackbar } = useSnackbar();

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = useForm();

  const onSubmit = async () => {
    try {
      await fetchWrapper(`/api/calendar-event/${plwdId}/${eventId}`, {
        method: 'DELETE',
      });

      refetch();
      closeDetailsModal();

      enqueueSnackbar(`Successfully deleted the event "${eventTitle}"!`, {
        variant: 'success',
      });
    } catch (error) {
      const _error = error as CustomError;
      enqueueSnackbar(`Failed to delete the event: ${_error}`, {
        variant: 'error',
      });
    }
  };

  return (
    <Modal onSubmit={handleSubmit(onSubmit)}>
      <h3 className="font-bold text-lg">
        Delete event &quot;{eventTitle}&quot;
      </h3>
      <p>Are you sure you want to delete this event?</p>
      <div className="modal-action">
        <button
          className="btn btn-outline"
          disabled={isSubmitting}
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>
        <button
          className={`btn btn-error${isSubmitting ? ' loading' : ''}`}
          type="submit"
        >
          Yes, delete event
        </button>
      </div>
    </Modal>
  );
};
