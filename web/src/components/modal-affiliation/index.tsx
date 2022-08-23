import { Modal, ModalActions } from '@components';
import { yupResolver } from '@hookform/resolvers/yup';
import { CustomError } from 'lib/CustomError';
import { fetchWrapper } from 'lib/fetch';
import { useSnackbar } from 'notistack';
import { useForm } from 'react-hook-form';
import { useAppUserContext } from 'src/hooks/useAppUserContext';
import { mutate } from 'swr';
import * as yup from 'yup';

type IModalAffiliation = {
  onClose: () => void;
};

const addAffiliationSchema = yup.object({
  affiliation: yup.string().required(),
});

type IAddAffiliationSchema = yup.InferType<typeof addAffiliationSchema>;

export const ModalAffiliation = ({ onClose }: IModalAffiliation) => {
  const { plwd } = useAppUserContext();
  const { enqueueSnackbar } = useSnackbar();
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<IAddAffiliationSchema>({
    mode: 'onBlur',
    defaultValues: { affiliation: '' },
    resolver: yupResolver(addAffiliationSchema),
  });

  const refetchAffiliations = async () => {
    await mutate(`/api/affiliations/${plwd.id}`);
  };

  const onSubmit = async (data: IAddAffiliationSchema) => {
    try {
      const affiliation = {
        affiliation: data.affiliation,
        plwdId: plwd.id,
      };

      await fetchWrapper(`/api/affiliation/${plwd.id}`, {
        method: 'POST',
        body: JSON.stringify(affiliation),
      });

      enqueueSnackbar(`Successfully added affiliation ${data.affiliation}`, {
        variant: 'success',
      });
      await refetchAffiliations();
      onClose();
    } catch (error) {
      const _error = error as CustomError;
      if (_error.statusCode === 409) {
        enqueueSnackbar(`Affiliation '${data.affiliation}' already exists`, {
          variant: 'error',
        });
      } else {
        enqueueSnackbar(
          `Failed to add affiliation ${data.affiliation}: ${_error}`,
          {
            variant: 'error',
          }
        );
      }
      onClose();
    }
  };

  return (
    <Modal onSubmit={handleSubmit(onSubmit)}>
      <h3 className="font-bold text-lg">Add affiliation</h3>
      <div className="w-full">
        <div className="flex">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">
                Enter the affiliation you want to add
              </span>
            </label>
            <input
              {...register('affiliation', { required: true })}
              className={`input input-bordered w-full ${
                errors.affiliation ? 'input-error' : ''
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
          Add
        </button>
      </ModalActions>
    </Modal>
  );
};
