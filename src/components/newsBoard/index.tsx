/* eslint-disable @typescript-eslint/naming-convention */
import React, { useEffect, useState } from 'react'
// import { convertToSeed, getProductBalance } from '../../services/barn'
import getConfig from 'next/config'

const { publicRuntimeConfig } = getConfig()

interface Offer {
  offer_id: string
  result_token_id: string
  price_per_token: number
}

interface Recipe {
  recipe_id: string
  ingredient_0_id: string
  ingredient_1_id: string
  ingredient_0_amount: number
  ingredient_1_amount: number
  result_token_id: string
}

interface SeedStat {
  seed_id: string
  growing_count: number
}

const NewsBoard = () => {
  const [isLoading, setIsLoading] = useState(false)

  const [error, setError] = useState('')
  // const [message, setMessage] = useState('')

  // OFFERS
  const [latestOffers, setLatestOffers] = useState<Offer[]>([])

  // RECIPES
  const [latestRecipes, setLatestRecipes] = useState<Recipe[]>([])

  // SEED STATS
  const [seedStats, setSeedStats] = useState<SeedStat[]>([])

  const tabs = ['Latest offers', 'Latest recipes', 'Now growing']
  const [activeTab, setActiveTab] = useState(tabs[0])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const { INDEXER_URL } = publicRuntimeConfig

      const [offersResponse, recipesResponse, statsResponse] = await Promise.all([
        fetch(`${INDEXER_URL}/latest-offers`),
        fetch(`${INDEXER_URL}/latest-recipes`),
        fetch(`${INDEXER_URL}/seed-stats`),
      ])

      if (!offersResponse.ok || !recipesResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to fetch data from one or more endpoints')
      }

      const [offers, recipes, stats] = await Promise.all([
        offersResponse.json(),
        recipesResponse.json(),
        statsResponse.json(),
      ])

      setLatestOffers(offers)
      setLatestRecipes(recipes)
      setSeedStats(stats)
    } catch (err: any) {
      setError(err?.message || 'An error occurred while fetching data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="flex flex-col">
      <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div className="mt-2 text-center text-gray-500">
          <div className="text-2xl">Market</div>
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
                  <div className="text-gray-500 text-left">
                    {latestOffers.map((offer) => (
                      <div key={offer.offer_id} className="mt-2 text-gray-500 text-left">
                        <p
                          role="none"
                          className="cursor-pointer"
                          onClick={() => navigator.clipboard.writeText(offer.offer_id)}
                          title="Click to copy full Offer ID"
                        >
                          {`Offer ID: `}
                          <span className="font-bold">
                            {`${offer.offer_id.slice(0, 4)}...${offer.offer_id.slice(-4)}`}
                          </span>
                        </p>
                        <p
                          role="none"
                          className="cursor-pointer"
                          onClick={() => navigator.clipboard.writeText(offer.result_token_id)}
                        >
                          {`Seed token ID: ${offer.result_token_id.slice(0, 4)}...${offer.result_token_id.slice(-4)}`}
                        </p>
                        <p>{`Price per token: ${offer.price_per_token}`}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === tabs[1] && (
          <div>
            <div className="mt-2">
              <div className="text-xl text-center text-gray-500">{activeTab}</div>
              <div className="px-2 py-3 rounded-sm">
                <div className="text-center">
                  <div className="text-gray-500 text-left">
                    {latestRecipes.map((recipe) => (
                      <div
                        role="none"
                        key={recipe.recipe_id}
                        className="mt-2 text-gray-500 text-left cursor-pointer"
                        title="Click to copy full Recipe ID"
                      >
                        <p
                          role="none"
                          className="cursor-pointer"
                          onClick={() => navigator.clipboard.writeText(recipe.recipe_id)}
                        >
                          {`Recipe ID: `}
                          <span className="font-bold">
                            {`${recipe.recipe_id.slice(0, 4)}...${recipe.recipe_id.slice(-4)}`}
                          </span>
                        </p>
                        <p
                          role="none"
                          className="cursor-pointer"
                          onClick={() => navigator.clipboard.writeText(recipe.ingredient_0_id)}
                        >
                          {`Ingredient 0 ID: `}
                          <span>{`${recipe.ingredient_0_id.slice(0, 4)}...${recipe.ingredient_0_id.slice(-4)}`}</span>
                        </p>
                        <p
                          role="none"
                          className="cursor-pointer"
                          onClick={() => navigator.clipboard.writeText(recipe.ingredient_1_id)}
                        >
                          {`Ingredient 1 ID: `}
                          <span>{`${recipe.ingredient_1_id.slice(0, 4)}...${recipe.ingredient_1_id.slice(-4)}`}</span>
                        </p>
                        <p
                          role="none"
                          className="cursor-pointer"
                          onClick={() => navigator.clipboard.writeText(recipe.result_token_id)}
                        >
                          {`Result token ID: `}
                          <span>{`${recipe.result_token_id.slice(0, 4)}...${recipe.result_token_id.slice(-4)}`}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === tabs[2] && (
          <div>
            <div className="mt-2">
              <div className="text-xl text-center text-gray-500">{activeTab}</div>
              <div className="px-2 py-3 rounded-sm">
                <div className="text-center">
                  <div className="text-gray-500 text-left">
                    {seedStats.map((stat) => (
                      <div
                        role="none"
                        key={stat.seed_id}
                        className="mt-2 text-gray-500 text-left cursor-pointer"
                        onClick={() => navigator.clipboard.writeText(stat.seed_id)}
                        title="Click to copy full Seed ID"
                      >
                        {`Seed ID: ${stat.seed_id.slice(0, 4)}...${stat.seed_id.slice(-4)}, Growing count: ${stat.growing_count}`}
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

export default NewsBoard
