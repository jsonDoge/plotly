/* eslint-disable @typescript-eslint/naming-convention */
import React, { useState } from 'react'
// import { convertToSeed, getProductBalance } from '../../services/barn'
import getConfig from 'next/config'
import { useSnapshot } from 'valtio'
import { walletStore } from '@/stores/wallet'
import { Connection, PublicKey } from '@solana/web3.js'
import { useAnchorProvider } from '@/context/solana'
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'

const getTokenAccountBalance = async (
  connection: Connection,
  walletAddress: string,
  seed: string,
): Promise<number | Error> => {
  try {
    const walletPublicKey = new PublicKey(walletAddress)
    const seedPublicKey = new PublicKey(seed)

    const associatedTokenAddress = PublicKey.findProgramAddressSync(
      [walletPublicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), seedPublicKey.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )

    const accountInfo = await connection.getTokenAccountBalance(associatedTokenAddress[0])
    return accountInfo.value.uiAmount || 0
  } catch (error) {
    return Error('Unable to fetch token account balance')
  }
}

const Barn = () => {
  const provider = useAnchorProvider()
  const [isLoading, setIsLoading] = useState(false)
  const { ownedSeeds, address } = useSnapshot(walletStore)

  const [error, setError] = useState('')
  const [seedBalance, setSeedBalance] = useState<any>({})

  const tabs = ['Seeds owned']
  const [activeTab, setActiveTab] = useState(tabs[0])

  return (
    <div className="flex flex-col">
      <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div className="mt-2 text-center text-gray-500">
          <div className="text-2xl">Barn</div>
        </div>
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-2 py-2 ${tab === activeTab ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-500'}`}
          >
            {tab}
          </button>
        ))}

        {activeTab === tabs[0] && (
          <div>
            <div className="mt-2">
              <div className="text-xl text-center text-gray-500">{activeTab}</div>
              <div className="px-2 py-3 rounded-sm">
                <div className="text-center">
                  <div className="text-gray-500 text-left max-h-96 overflow-y-auto">
                    {ownedSeeds.map((seed) => (
                      <div key={seed.id} className="mt-2 text-gray-500 text-left">
                        <div
                          role="none"
                          className="cursor-pointer"
                          onClick={() => navigator.clipboard.writeText(seed.id)}
                          title="Click to copy full Offer ID"
                        >
                          {`Seed ID: ${seed.id.slice(0, 4)}...${seed.id.slice(-4)}`}
                        </div>
                        <div className="text-gray-400"> {`Seed Name: ${seed.name}`}</div>

                        {seedBalance[seed.id] ? (
                          <div className="text-gray-400"> {`Seed Balance: ${seedBalance[seed.id]}`}</div>
                        ) : (
                          <div>
                            <button
                              type="button"
                              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                              onClick={async () => {
                                try {
                                  setError('')
                                  setIsLoading(true)
                                  getTokenAccountBalance(provider.connection, address, seed.id).then(
                                    (balanceOrError) => {
                                      if (balanceOrError instanceof Error) {
                                        setIsLoading(false)

                                        setError(balanceOrError.message)
                                        return
                                      }
                                      setSeedBalance((prevState: any) => ({
                                        ...prevState,
                                        [seed.id]: balanceOrError,
                                      }))
                                    },
                                  )
                                } catch (err) {
                                  setError('Failed to fetch balance')
                                } finally {
                                  setIsLoading(false)
                                }
                              }}
                              disabled={isLoading}
                            >
                              {isLoading ? 'Loading...' : 'Check Balance'}
                            </button>
                            <span id={`balance-${seed.id}`} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-center">*You can get the full ID by clicking on the entry </div>
        <div className="text-center mt-5 bg-black bg-opacity-50">
          {error && <div className="text-red-500">{error}</div>}
        </div>
        {/* <div className="text-center mt-5 bg-black bg-opacity-50">
          {message && <div className="text-green-500">{message}</div>}
        </div> */}
      </div>
    </div>
  )
}

export default Barn
