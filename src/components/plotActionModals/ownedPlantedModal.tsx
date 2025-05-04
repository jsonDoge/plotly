import React, { useState } from 'react'

import Button from '../utils/button'
import { PlotInfo } from '../game/utils/interfaces'
import { PlantState } from '@/utils/enums'

interface Props {
  isLoading: boolean
  onTend: () => void
  onHarvest: () => void
  onRevert: () => void
  onCancel?: () => void
  plotInfo: PlotInfo
  currentBlock: number
}

const OwnedPlantedModal: React.FC<Props> = ({
  isLoading,
  onTend,
  onHarvest,
  onRevert,
  onCancel,
  plotInfo,
  currentBlock
}) => {
  const tabs = ['Tend', 'Harvest', 'Revert']
  const [activeTab, setActiveTab] = useState(tabs[0])

  // dumb way to fix typescript TODO: do it properly later
  if (!plotInfo.plant) {
    return null
  }

  const waterRegen = plotInfo.waterRegen - plotInfo.centerPlantDrainRate + plotInfo.leftPlantDrainRate + plotInfo.rightPlantDrainRate + plotInfo.upPlantDrainRate + plotInfo.downPlantDrainRate

  // tend
  const tendTimesLeft = plotInfo.plant.timesToTend - plotInfo.plant.timesTended
  const canTend = plotInfo.plant.state === PlantState.NEEDS_TENDING
  

  // harvest
  const balanceTillFinished = plotInfo.plant.balanceRequired.sub(plotInfo.plant.balanceAbsorbed)
  const balanceTillFinishedStr = balanceTillFinished.toString()
  const waterTillFinished = plotInfo.plant.waterRequired - plotInfo.plant.waterAbsorbed < 0 ? 0 : plotInfo.plant.waterRequired - plotInfo.plant.waterAbsorbed
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

          <div className="mt-2 text-center">
            <p className="text-gray-500">{`Plant water: ${plotInfo.plant?.waterAbsorbed} / ${plotInfo.plant?.waterRequired} 🚰`}</p>
            <p className="text-gray-500">{`Plant balance: ${plotInfo.plant?.balanceAbsorbed} / ${plotInfo.plant?.balanceRequired}💰`}</p>
            <p className="text-gray-500">{`Balance drain rate: ${plotInfo.plant?.balanceAbsorbRate} 💰`}</p>
            <p className="text-gray-500">{`Water drain rate: ${plotInfo.plant?.actualWaterAbsorbRate} 🚰`}</p>
            <p className="text-gray-500">
              <span>Tending: </span>
              { plotInfo.plant?.state === PlantState.NEEDS_TENDING ? (
                <span className='text-red-500 font-bold'>Please tend to continue healthy growth!</span> ) : (<span>Tended</span>)
              }
            </p>
          </div>

          {activeTab === tabs[0] && (
            <div>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Tend to the plant 🌿
                    </h3>
                    <div className="text-sm text-gray-500">
                      <span>Some plants may need tending so they would keep absorbing balance. Otherwise they'll stop :( Tending is only allowed at regular intervals.</span>
                      {
                      plotInfo.plant?.timesToTend > 0 ? (
                        <div>
                          <p className="text-sm text-gray-500">
                            {`This plant has been tended ${plotInfo.plant?.timesTended} times. It will still need to be tended ${tendTimesLeft} more times.`}
                          </p>
                          <p className="text-sm text-gray-500 mt-2">
                            {`Next tending is available at block ${plotInfo.plant?.nextTendFrom} / now: ${currentBlock}.`}
                          </p>
                        </div>
                        ) : (
                          <p className="text-sm text-gray-500">
                            {`This plant doesn't need tending :).`}
                          </p>
                        )
                      }
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button disabled={!canTend} onClick={() => onTend()}>Tend</Button>
                {onCancel && <Button onClick={() => onCancel()}>Close</Button>}
              </div>
            </div>
          )}

          {activeTab === tabs[1] && (
            <div>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Harvest plant 🌾
                    </h3>
                    <div>
                    <p className="text-sm text-gray-500">
                      {`Once plants absorb enough water and balance they will be harvestable.`}
                    </p>
                    <p className="text-sm text-gray-500">
                      {`This plant still needs to absorb `}
                      <b>{balanceTillFinishedStr}</b>
                      {` balance and `}
                      <b>{waterTillFinished}</b> {` water before it can be harvested.`}
                    </p>
                  </div>
                  </div>
                 
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button disabled={balanceTillFinished.gtn(0) || waterTillFinished > 0} onClick={() => onHarvest()}>It's harvestin time!</Button>
                {onCancel && <Button onClick={() => onCancel()}>Close</Button>}
              </div>
            </div>
          )}

          {activeTab === tabs[2] && (
            <div>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Revert plant to seed 🌱
                    </h3>
                    <div>
                      <p className="text-sm text-gray-500">
                        {`All water and balance absorbed will be lost. The plant will be reverted to a seed and sent back to your wallet. This can be done any time during growth.`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button onClick={() => onRevert()}>Revert</Button>
                {onCancel && <Button onClick={() => onCancel()}>Close</Button>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OwnedPlantedModal
