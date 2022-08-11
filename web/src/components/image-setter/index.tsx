import Image from 'next/image';
import { useEffect, useRef } from 'react';

interface IImageSetter {
  base64image: string | undefined;
  setBase64Image: (base64image: string | undefined) => void;
  label?: string;
  height?: string;
  width?: string;
}

export const ImageSetter: React.FC<IImageSetter> = ({
  base64image,
  setBase64Image,
  label = 'Upload image',
  height = 'h-[120px]',
  width = 'w-[200px]',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fileInputRef && fileInputRef.current && !base64image) {
      // Clear file input if selected image is not set
      fileInputRef.current.value = '';
    }
  }, [base64image]);

  return (
    <div>
      <label className="label">
        <span className="label-text">{label}</span>
      </label>
      {base64image && (
        <div className={`${width} ${height} relative mb-4`}>
          <Image
            alt="Profile picture"
            layout="fill"
            objectFit="contain"
            src={base64image}
          />
          <button
            className="btn absolute left-2 top-0 btn-secondary btn-circle btn-sm my-2"
            onClick={() => setBase64Image(undefined)}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 18L18 6M6 6l12 12"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </button>
        </div>
      )}
      <input
        className="cursor-pointer float-left"
        name="imageUpload"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (file) {
            const imageSrc = URL.createObjectURL(file);
            const blob = await fetch(imageSrc).then((r) => r.blob());
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
              const base64data = reader.result?.toString();
              setBase64Image(base64data);
            };
          } else {
            setBase64Image(undefined);
          }
        }}
        ref={fileInputRef}
        type="file"
      />
    </div>
  );
};
