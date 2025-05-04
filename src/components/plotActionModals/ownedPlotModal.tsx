import React, { useState } from 'react'

import Button from '../utils/button'
import { PlotInfo } from '../game/utils/interfaces'

interface Props {
  isLoading: boolean
  onPlant: (seedMint: string) => void
  onDeposit: (amount: number) => void
  onReturn: () => void
  onCancel?: () => void
  plotInfo: PlotInfo
}

const OwnedPlotModal: React.FC<Props> = ({
  isLoading,
  onPlant,
  onDeposit,
  onReturn,
  onCancel,
  plotInfo,
}) => {
  const [seedMintId, setSeedMintId] = useState<string>('')
  const [depositAmount, setDepositAmount] = useState<number>(1)

  // dumb way to fix typescript TODO: do it properly later
  if (!plotInfo) {
    return null
  }

  const tabs = ['Plant', 'Deposit', 'Return']
  const [activeTab, setActiveTab] = useState(tabs[0])

  const waterRegen = plotInfo.waterRegen - plotInfo.centerPlantDrainRate + plotInfo.leftPlantDrainRate + plotInfo.rightPlantDrainRate + plotInfo.upPlantDrainRate + plotInfo.downPlantDrainRate

  return (
    <div
      className="fixed z-10 inset-0 -top-20 overflow-y-auto"
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
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 ${tab === activeTab ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-500'}`}
            >
              {tab}
            </button>
          ))}

          <div className="mt-2 text-center">
            <p className="text-gray-500">{`Plot water level (1M max): ${plotInfo.waterLevel} 🚰`}</p>
            <p className="text-gray-500">
              <span>Plot balance (Rent free >1M): </span>
              <span className={ plotInfo.balance.ltn(1000000) ? 'text-red-500 font-bold' : '' }>
                {plotInfo.balance.toString()} 💰
                </span>
            </p>
            <p className="text-gray-500">{`Water regen (90 max): ${waterRegen} 📈`}</p>
          </div>

          {activeTab === tabs[0] && (
            <div>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Plant a seed 🌱
                    </h3>
                    <div>
                      <p className="text-sm text-gray-500">
                        You already have to own the seed. It will be planted and immediately start growing.
                      </p>
                    </div>
                    <div className="mt-2">
                      {/* TODO add seed balances here */}
                      <p className="mt-5">
                        <label htmlFor="seedType" className="block text-sm font-medium text-gray-700">
                          Seed mint ID
                        </label>
                        <input
                          className="w-full rounded-sm"
                          id="SeedMintId"
                          name="SeedMintId"
                          type="string"
                          value={seedMintId}
                          onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
                            setSeedMintId(e.target.value)
                          }}
                        />
                      </p>
                      <p className="text-sm text-gray-500" />
                      <p>
                        <span className="text-gray-400 text-sm">*make sure you have enough seeds</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button onClick={() => onPlant(seedMintId)}>Plant!</Button>
                {onCancel && <Button onClick={() => onCancel()}>Close</Button>}
              </div>
            </div>
          )}

          {activeTab === tabs[1] && (
            <div>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Deposit to plot 💰
                  </h3>
                  <div className="mt-2">
                    <p className="mt-5">
                      <label htmlFor="seedType" className="block text-sm font-medium text-gray-700">
                        Amount to deposit
                      </label>
                      <input
                        className="w-full rounded-sm"
                        id="DepositAmount"
                        name="DepositAmount"
                        type="number"
                        min={1}
                        value={depositAmount}
                        onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setDepositAmount(parseInt(e.target.value, 10))
                        }}
                      />
                    </p>
                    <p className="text-sm text-gray-500" />
                    <p>
                      <span className="text-gray-400 text-sm">*make sure you have enough tokens</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button onClick={() => onDeposit(depositAmount)}>Deposit!</Button>
                {onCancel && <Button onClick={() => onCancel()}>Close</Button>}
              </div>
            </div>
          )}

          {activeTab === tabs[2] && (
            <div>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="mt-3 text-center">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Return plot to Plotly 🏡
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500" />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button onClick={() => onReturn()}>Return</Button>
                {onCancel && <Button onClick={() => onCancel()}>Close</Button>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OwnedPlotModal
