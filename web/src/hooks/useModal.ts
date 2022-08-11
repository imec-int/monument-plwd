import { useCallback, useState } from 'react';

export const useModal = ({ isInitiallyOpen = false } = {}) => {
  const [isVisible, setVisibility] = useState(isInitiallyOpen);

  const open = useCallback(() => {
    setVisibility(true);
  }, []);

  const close = useCallback(() => {
    setVisibility(false);
  }, []);

  const toggle = useCallback(() => {
    setVisibility(!isVisible);
  }, [isVisible]);

  return { isVisible, open, close, toggle };
};
