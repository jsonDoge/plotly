import {
  // createDefaultRpcTransport,
  type RpcDevnet,
  type GetBlockHeightApi,
  // createSolanaRpcFromTransport,
  createSolanaRpc,
} from '@solana/kit'
import getConfig from 'next/config'

const { publicRuntimeConfig } = getConfig()

let rpc: RpcDevnet<GetBlockHeightApi> | null = null

/**
 * Triggered when provider's websocket is open.
 */
const startConnection = (): RpcDevnet<GetBlockHeightApi> => {
  // const transport = createDefaultRpcTransport({ url: publicRuntimeConfig.SOLANA_PROVIDER })

  // rpc = createSolanaRpcFromTransport(transport) as any

  console.log(publicRuntimeConfig.SOLANA_PROVIDER)

  rpc = createSolanaRpc(publicRuntimeConfig.SOLANA_PROVIDER) as any

  console.log(JSON.stringify(rpc))

  if (!rpc) {
    throw new Error('provider not found')
  }

  return rpc as RpcDevnet<GetBlockHeightApi>
}

export default () => rpc || startConnection()
