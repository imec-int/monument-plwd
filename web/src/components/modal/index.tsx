import { FormEventHandler, ReactNode, useEffect, useState } from 'react';

type IModal = {
  children: ReactNode;
  className?: string;
  boxClassName?: string;
  onSubmit?: FormEventHandler<HTMLFormElement> | undefined;
};

export const Modal = ({
  children,
  className,
  boxClassName,
  onSubmit,
}: IModal) => {
  const [isOpenClass, setIsOpenClass] = useState('');

  // Used to have an animation on the modal
  useEffect(() => {
    setTimeout(() => {
      setIsOpenClass('modal-open');
    }, 100);
  }, []);

  return (
    <div
      className={`modal w-full ${isOpenClass} ${className ?? ''}`}
      id="add-contact"
    >
      <form className={`modal-box ${boxClassName ?? ''}`} onSubmit={onSubmit}>
        {children}
      </form>
    </div>
  );
};

export const ModalActions = ({ children }: { children: ReactNode }) => (
  <div className="modal-action">{children}</div>
);
