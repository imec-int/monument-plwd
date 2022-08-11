import { ImageSetter } from '@components';
import { Controller } from 'react-hook-form';

interface IImageSetterController {
  control: any;
  name?: string;
}

export const ImageSetterController: React.FC<IImageSetterController> = ({
  control,
  name = 'picture',
}) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => (
        <ImageSetter
          base64image={value}
          label="Upload avatar (optional)"
          setBase64Image={(base64) => {
            onChange(base64);
          }}
        />
      )}
    />
  );
};
