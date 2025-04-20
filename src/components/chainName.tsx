/* eslint-disable no-bitwise */
import getConfig from 'next/config';
import React, { FC } from 'react';

const { publicRuntimeConfig } = getConfig();

const ChainName: FC = () => {
  return (
    <div className="font-bold mr-5">
      <div className="inline">Chain: {publicRuntimeConfig.CHAIN_NAME || 'LOADING'}</div>
    </div>
  );
};

export default ChainName;
