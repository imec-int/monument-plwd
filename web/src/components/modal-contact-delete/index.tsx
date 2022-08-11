import { Modal, ModalActions } from '@components';
import { yupResolver } from '@hookform/resolvers/yup';
import { ICarecircleMember } from '@interfaces';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';

type IModalContactDelete = {
  action: () => Promise<void>;
  contact: ICarecircleMember;
  onClose: () => void;
};

const deleteUserSchema = (contact: ICarecircleMember) =>
  yup.object({
    confirm: yup.string().oneOf([contact.user.email]).required(),
  });

type IDeleteUserSchema = yup.InferType<ReturnType<typeof deleteUserSchema>>;

export const ModalContactDelete = ({
  action,
  contact,
  onClose,
}: IModalContactDelete) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<IDeleteUserSchema>({
    mode: 'onBlur',
    defaultValues: { confirm: '' },
    resolver: yupResolver(deleteUserSchema(contact)),
  });

  const onSubmit = async () => {
    await action();
  };

  return (
    <Modal onSubmit={handleSubmit(onSubmit)}>
      <h3 className="font-bold text-lg">Delete contact</h3>
      <div className="w-full">
        <div className="flex">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">
                Type {contact.user.email} to confirm deletion.
              </span>
            </label>
            <input
              {...register('confirm', { required: true })}
              className={`input input-bordered w-full ${
                errors.confirm ? 'input-error' : ''
              }`}
              type="text"
            />
          </div>
        </div>
      </div>
      <ModalActions>
        <button className="btn btn-ghost" onClick={onClose} type="button">
          Cancel
        </button>
        <button className="btn btn-error" disabled={!isValid} type="submit">
          Delete {contact.user.firstName} {contact.user.lastName}
        </button>
      </ModalActions>
    </Modal>
  );
};
