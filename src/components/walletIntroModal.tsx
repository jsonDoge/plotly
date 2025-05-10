import React from 'react'

import Button from './utils/button'

interface Props {
  onConfirm: () => void
}

const WalletIntroModal: React.FC<Props> = ({ onConfirm }) => {
  const confirm = () => onConfirm && onConfirm()

  return (
    <div
      className="fixed z-50 inset-0 -top-20 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
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
                  WELCOME to Plotly!
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-700">
                    This farm uses solana devnet USDC. Visit{' '}
                    <a
                      href="https://faucet.circle.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 underline"
                    >
                      faucet.circle.com
                    </a>{' '}
                    to request tokens. For more details and mechanics go to &quot;Help&quot; section or more technical
                    review in{' '}
                    <a
                      href="https://github.com/jsonDoge/plotly"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 underline"
                    >
                      github
                    </a>
                    .
                  </p>
                  <p className="text-sm text-gray-700 mt-2">
                    Please &quot;select wallet&quot; in the top right (or mobile burger button) to start playing
                  </p>
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
  )
}

export default WalletIntroModal
