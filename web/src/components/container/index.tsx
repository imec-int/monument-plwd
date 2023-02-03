import { PropsWithChildren } from 'react';

interface IContainer {
  className?: string;
}

export const Container = ({
  children,
  className,
}: PropsWithChildren<IContainer>) => {
  return (
    <div
      className={`px-4 lg:px-10 align-middle flex flex-col bg-white dark:bg-slate-800 overflow-y-scroll pb-8 ${className}`}
    >
      {children}
    </div>
  );
};
