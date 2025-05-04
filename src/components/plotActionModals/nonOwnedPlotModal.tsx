import React, { useState } from 'react'

import Button from '../utils/button'
import { PlotInfo } from '../game/utils/interfaces'

interface Props {
  isLoading: boolean
  onRevoke: () => void
  onCancel?: () => void
  plotInfo: PlotInfo
}

const NonOwnedPlotModal: React.FC<Props> = ({ isLoading, onRevoke, onCancel, plotInfo }) => {
  // dumb way to fix typescript TODO: do it properly later
  if (!plotInfo) {
    return null
  }

  const tabs = ['Revoke']
  const [activeTab, setActiveTab] = useState(tabs[0])

  const waterRegen =
    plotInfo.waterRegen -
    plotInfo.centerPlantDrainRate +
    plotInfo.leftPlantDrainRate +
    plotInfo.rightPlantDrainRate +
    plotInfo.upPlantDrainRate +
    plotInfo.downPlantDrainRate

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
              <span>Plot balance (Rent free &gt;1M): </span>
              <span className={plotInfo.balance.ltn(1000000) ? 'text-red-500 font-bold' : ''}>
                {plotInfo.balance.toString()} 💰
              </span>
            </p>
            <p className="text-gray-500">{`Water regen (90 max): ${waterRegen} 📈`}</p>
          </div>

          {activeTab === tabs[0] && (
            <div>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="mt-3 text-center">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Revoke plot ownership 🏡
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      If plot balance falls below 10% (100k), plot can be revoked. As a revoker you can claim the
                      remaining balance if any left
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button onClick={() => onRevoke()}>Revoke</Button>
                {onCancel && <Button onClick={() => onCancel()}>Close</Button>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NonOwnedPlotModal
