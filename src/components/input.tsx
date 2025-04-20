import React from 'react';

interface Props {
  onInput?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type: string;
  id?: string;
  name?: string;
  value: any;
}

const Input: React.FC<Props> = ({ onInput, type, id, name, value }) => (
  <input
    onInput={onInput}
    type={type}
    id={id}
    name={name}
    value={value}
    className="
      shadow
      appearance-none
      border
      rounded
      w-full
      py-2
      px-3
      text-gray-700
      leading-tight
      focus:outline-none
      focus:shadow-outline"
  />
);

export default Input;
