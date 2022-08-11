import { IButton } from '@interfaces';

export const Button: React.FC<IButton> = ({
  className = '',
  children,
  ...rest
}) => {
  return (
    <button
      className={`font-light py-2 px-4 my-2.5 text-white-500 border border-white-500 hover:bg-white hover:bg-opacity-50 hover:text-white active:bg-white-600 uppercase px-8 py-3 rounded outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};
