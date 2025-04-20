import React, { useEffect, useState } from 'react';
import Button from '../button';
import Spinner from '../spinner';
import { craftDish, getDishBalance } from '../../services/kitchen';
import { useWallet } from '../../context/wallet';
import { toSentenceCase } from '../../utils';
import { PRODUCT_TYPE } from '../../utils/constants';

const Kitchen = () => {
  const { wallet } = useWallet();
  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState('');

  const [potatoDishBalance, setPotatoDishBalance] = useState(0);
  const [carrotDishBalance, setCarrotDishBalance] = useState(0);
  const [cornDishBalance, setCornDishBalance] = useState(0);
  const [weedDishBalance, setWeedDishBalance] = useState(0);

  const [productType0, setProductType0] = useState(PRODUCT_TYPE.CARROT);
  const [quantity0, setQuantity0] = useState(0);
  const [productType1, setProductType1] = useState(PRODUCT_TYPE.CARROT);
  const [quantity1, setQuantity1] = useState(0);
  const [productType2, setProductType2] = useState(PRODUCT_TYPE.CARROT);
  const [quantity2, setQuantity2] = useState(0);

  const refreshBalances = async (walletAddress: string) => {
    getDishBalance(walletAddress, PRODUCT_TYPE.POTATO).then(setPotatoDishBalance);
    getDishBalance(walletAddress, PRODUCT_TYPE.CARROT).then(setCarrotDishBalance);
    getDishBalance(walletAddress, PRODUCT_TYPE.CORN).then(setCornDishBalance);
    getDishBalance(walletAddress, PRODUCT_TYPE.WEED).then(setWeedDishBalance);
  };

  useEffect(() => {
    if (!wallet?.address) {
      return;
    }

    refreshBalances(wallet.address);
  }, [wallet?.address]);

  const onDishCraft = async (
    productTypes: string[],
    quantities: number[],
    walletAddress: string,
    privateKey: string | undefined,
  ) => {
    setError('');
    if (!privateKey) {
      return;
    }
    setIsLoading(true);

    const nonZeroQuantities = quantities.filter((q) => q > 0);
    const nonZeroQuantityIndexes = quantities.map((q, i) => (q > 0 ? i : -1)).filter((i) => i > -1);
    const nonZeroQuantityProductTypes = productTypes.filter((_, i) => nonZeroQuantityIndexes.includes(i));

    try {
      await craftDish(nonZeroQuantityProductTypes, nonZeroQuantities, walletAddress, privateKey);
    } catch (e) {
      setError('Craft failed or non-existent combo');
      setIsLoading(false);
      return;
    }
    refreshBalances(walletAddress);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col">
      <div className="text-left text-white">
        <div className="text-2xl">Kitchen</div>
      </div>
      <div className="flex justify-start items-start mt-5 text-white">
        <div className="text-xl">Craft dish (NFT)</div>
      </div>
      <div className="mb-2">
        <div className="mt-2 text-white">Ingredients</div>
        <div className="text-white text-sm">0 will be ignored</div>
        <div className="grid grid-cols-3 gap-3 bg-green-200 px-2 py-3 rounded-sm">
          <div className="text-center">
            <input
              className="w-full"
              id="quantity0"
              name="quantity0"
              max={100}
              min={0}
              type="number"
              value={quantity0}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity0(parseInt(e.target.value || '0', 10))}
            />
            <select
              className="w-full mt-2"
              onChange={(e) => {
                setProductType0(e.target.value);
              }}
              value={productType0}
            >
              {Object.values(PRODUCT_TYPE).map((v) => (
                <option key={v} value={v}>
                  {toSentenceCase(v)}
                </option>
              ))}
            </select>
          </div>
          <div className="text-center">
            <input
              className="w-full"
              id="quantity1"
              name="quantity1"
              max={100}
              min={0}
              type="number"
              value={quantity1}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity1(parseInt(e.target.value, 10))}
            />
            <select
              className="w-full mt-2"
              onChange={(e) => {
                setProductType1(e.target.value);
              }}
              value={productType1}
            >
              {Object.values(PRODUCT_TYPE).map((v) => (
                <option key={v} value={v}>
                  {toSentenceCase(v)}
                </option>
              ))}
            </select>
          </div>
          <div className="text-center">
            <input
              className="w-full"
              id="quantity2"
              name="quantity2"
              max={100}
              min={0}
              type="number"
              value={quantity2}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity2(parseInt(e.target.value, 10))}
            />
            <select
              className="w-full mt-2"
              onChange={(e) => {
                setProductType2(e.target.value);
              }}
              value={productType2}
            >
              {Object.values(PRODUCT_TYPE).map((v) => (
                <option key={v} value={v}>
                  {toSentenceCase(v)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="flex flex-col mt-5">
        <div className="text-right">
          {wallet?.address ? (
            <Button
              onClick={() =>
                onDishCraft(
                  [productType0, productType1, productType2],
                  [quantity0, quantity1, quantity2],
                  wallet.address,
                  wallet.privateKey,
                )
              }
            >
              {!isLoading && <div>Try craft dish</div>}
              {isLoading && <Spinner />}
            </Button>
          ) : (
            <Spinner />
          )}
        </div>
        <div className="text-center mt-5 bg-black bg-opacity-50">
          {error && <div className="text-red-500">{error}</div>}
        </div>
      </div>
      <div className="flex flex-col justify-start items-start mt-4 text-white">
        <div className="text-lg">Dishes</div>
        <div>(owned)</div>
      </div>
      <div className="flex flex-row bg-green-200 py-5 rounded-sm">
        <div className="font-bold w-1/3 text-center">3x Potato</div>
        <div className="w-2/3 text-right px-10">{potatoDishBalance}</div>
      </div>
      <div className="flex flex-row bg-green-200 py-5 mt-2 rounded-sm">
        <div className="font-bold w-1/3 text-center">3x Carrot</div>
        <div className="w-2/3 text-right px-10">{carrotDishBalance}</div>
      </div>
      <div className="flex flex-row bg-green-200 py-5 mt-2 rounded-sm">
        <div className="font-bold w-1/3 text-center">3x Corn</div>
        <div className="w-2/3 text-right px-10">{cornDishBalance}</div>
      </div>
      <div className="flex flex-row bg-green-200 py-5 mt-2 rounded-sm">
        <div className="font-bold w-1/3 text-center">3x Weed</div>
        <div className="w-2/3 text-right px-10">{weedDishBalance}</div>
      </div>
    </div>
  );
};

export default Kitchen;
