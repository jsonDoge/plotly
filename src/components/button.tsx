import React from 'react';

interface Props {
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

const Button: React.FC<Props> = ({ children, onClick, disabled = false }) => (
  <button
    disabled={disabled}
    onClick={onClick}
    type="button"
    className={`
      mt-3
      w-full
      inline-flex
      justify-center
      rounded-md
      border
      border-gray-300
      shadow-sm
      px-4
      py-2
      bg-white
      text-base
      font-medium
      text-gray-700
      hover:bg-gray-50
      focus:outline-none
      focus:ring-2
      focus:ring-offset-2
      focus:ring-indigo-500
      sm:mt-0
      sm:ml-3
      sm:w-auto
      sm:text-sm
      ${disabled ? ' bg-gray-300 hover:bg-gray-300 text-gray-100 cursor-not-allowed	' : ''}
      `}
  >
    {children}
  </button>
);

export default Button;
