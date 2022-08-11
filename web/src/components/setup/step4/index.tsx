import { Container } from '@components';
import { InfoIcon } from '@components/icons/InfoIcon';
import { yupResolver } from '@hookform/resolvers/yup';
import { ISetupStep } from '@interfaces';
import { Tooltip } from '@mui/material';
import { ChangeEvent, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useWatchVerification } from 'src/hooks/useWatchVerification';
import * as yup from 'yup';

const watchSetupSchema = yup
  .object({
    imei: yup
      .string()
      .test('len', 'Length must be exactly 15 digits', (value = '') => {
        console.warn(value.length, value);

        return value.length === 15;
      })
      .required(),
  })
  .required();

export const SetupStep4: React.FC<ISetupStep> = ({ nextStep }) => {
  const {
    formState: { errors, isValid },
    handleSubmit,
    register,
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      imei: '',
    },
    resolver: yupResolver(watchSetupSchema),
    mode: 'onChange',
  });

  const imei = watch('imei');

  const { data, error, loading } = useWatchVerification(
    isValid ? imei : undefined
  );

  console.warn({ data, error, loading, isValid, errors });

  const onSubmit = (data: any) => {
    console.warn(data);
  };

  const { onChange, ...rest } = register('imei');

  const onChangeIMEI = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      isNaN(Number(e.currentTarget.value))
        ? setValue(
            'imei',
            e.currentTarget.value.slice(0, e.currentTarget.value.length - 1)
          )
        : onChange(e);
    },
    [onChange, setValue]
  );

  return (
    <Container>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="card m-auto w-[40rem] text-center p-8 bg-base-100 shadow-xl my-8">
          <h2 className="card-title text-center my-4 m-auto">
            Kompy watch setup
          </h2>
          <div>
            <div className="form-control w-full">
              <label className="label">
                <Tooltip title="An IMEI consists of 15 digits - you can find it on the side of the box of the watch">
                  <span className="label-text flex">
                    Enter the IMEI number of your Kompy watch
                    <InfoIcon />
                  </span>
                </Tooltip>
              </label>
              <input
                {...rest}
                autoComplete="off"
                className="input input-bordered input-info w-full"
                maxLength={15}
                onChange={onChangeIMEI}
                placeholder="Enter IMEI number"
                type="text"
              />
            </div>
          </div>
          <button className="btn btn-secondary mt-4" type="submit">
            Verify Kompy watch
          </button>
        </div>
      </form>
    </Container>
  );
};
