// eslint-disable-next-line import/prefer-default-export
export const createStore = (defaultValue: any) => {
  let value = defaultValue;

  const callbacks: ((newValue: any) => void)[] = [];

  const getValue = () => value;

  const setValue = (newValue: any) => {
    value = newValue;
    callbacks.forEach((cb) => cb(newValue));
  };

  const onChange = (cb: (newValue: any) => void) => {
    callbacks.push(cb);
    return () => {
      const index = callbacks.indexOf(cb);
      if (index === -1) return;

      callbacks.splice(index, 1);
    };
  };

  return {
    getValue,
    setValue,
    onChange,
  };
};
