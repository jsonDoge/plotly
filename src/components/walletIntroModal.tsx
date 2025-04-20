import React from 'react';

import Button from './button';

interface Props {
  walletAddress: string;
  onConfirm: () => void;
}

const WalletIntroModal: React.FC<Props> = ({ walletAddress, onConfirm }) => {
  const confirm = () => onConfirm && onConfirm();

  return (
    <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-opacity-75 transition-opacity" aria-hidden="true" />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  Your wallet
                </h3>
                <div className="mt-2 text-md">
                  <p className="text-gray-500">
                    Thank you for trying this game! To complete action you&apos;ll need a crypto wallet, currently the
                    only option is our local generated wallet.
                  </p>
                  <p className="text-gray-500 mt-5">
                    <span className="inline">
                      Your address is <span className="font-semibold">{walletAddress}</span>, make sure you have enough
                      currency to make transactions. You can always find it in the top left corner (or extended menu in
                      mobile).
                    </span>
                  </p>
                  <p className="text-gray-500 mt-5">
                    <span className="font-semibold">BUT KNOW THAT THIS WALLET METHOD IS NOT SAFE</span> and currently
                    used only for testing. The wallet is stored in browser&apos;s local storage and if cleared - will be
                    lost forever.
                  </p>
                  <p className="text-gray-500 mt-5">Planning to add metamask.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button onClick={confirm}>Okay</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletIntroModal;
