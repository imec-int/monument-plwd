import { Modal, ModalActions } from '@components';

type IModalEventConfirm = {
  onSubmit: () => Promise<void>;
  onClose: () => void;
};

export const ModalEventConfirm = ({
  onSubmit,
  onClose,
}: IModalEventConfirm) => {
  return (
    <Modal onSubmit={onSubmit}>
      <h3 className="font-bold text-lg">Create Event</h3>
      <div className="w-full">
        <div className="flex">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">
                You did not set any address for this event. Are you sure you
                want to continue?
              </span>
            </label>
          </div>
        </div>
      </div>
      <ModalActions>
        <button className="btn btn-ghost" onClick={onClose} type="button">
          Cancel
        </button>
        <button className="btn btn-error" type="submit">
          Confirm
        </button>
      </ModalActions>
    </Modal>
  );
};
