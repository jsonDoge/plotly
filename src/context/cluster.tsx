/* eslint-disable react/jsx-no-constructed-context-values */

'use client'

// import { Connection } from '@solana/kit'
import { atom, useAtomValue, useSetAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { createContext, ReactNode, useContext } from 'react'
import toast from 'react-hot-toast'
import getConfig from 'next/config'

const { publicRuntimeConfig } = getConfig()

export interface Cluster {
  name: string
  endpoint: string
  network?: ClusterNetwork
  active?: boolean
}

export enum ClusterNetwork {
  //   Mainnet = 'mainnet-beta',
  //   Testnet = 'testnet',
  Devnet = 'devnet',
  Custom = 'custom',
}

// By default, we don't configure the mainnet-beta cluster
// The endpoint provided by clusterApiUrl('mainnet-beta') does not allow access from the browser due to CORS restrictions
// To use the mainnet-beta cluster, provide a custom endpoint
export const defaultClusters: Cluster[] = [
  {
    name: 'devnet',
    endpoint: publicRuntimeConfig.SOLANA_DEVNET_URL,
    network: ClusterNetwork.Devnet,
  },
  { name: 'local', endpoint: publicRuntimeConfig.SOLANA_LOCALNET_URL },
]

const clusterAtom = atomWithStorage<Cluster>('solana-cluster', defaultClusters[0])
const clustersAtom = atomWithStorage<Cluster[]>('solana-clusters', defaultClusters)

const activeClustersAtom = atom<Cluster[]>((get) => {
  const clusters = get(clustersAtom)
  const cluster = get(clusterAtom)
  return clusters.map((item) => ({
    ...item,
    active: item.name === cluster.name,
  }))
})

const activeClusterAtom = atom<Cluster>((get) => {
  const clusters = get(activeClustersAtom)

  return clusters.find((item) => item.active) || clusters[0]
})

export interface ClusterProviderContext {
  cluster: Cluster
  clusters: Cluster[]
  addCluster: (cluster: Cluster) => void
  deleteCluster: (cluster: Cluster) => void
  setCluster: (cluster: Cluster) => void
  getExplorerUrl(path: string): string
}

const Context = createContext<ClusterProviderContext>({} as ClusterProviderContext)

function getClusterUrlParam(cluster: Cluster): string {
  let suffix = ''
  switch (cluster.network) {
    case ClusterNetwork.Devnet:
      suffix = 'devnet'
      break
    default:
      suffix = `custom&customUrl=${encodeURIComponent(cluster.endpoint)}`
      break
  }

  return suffix.length ? `?cluster=${suffix}` : ''
}

export function ClusterProvider({ children }: { children: ReactNode }) {
  const cluster = useAtomValue(activeClusterAtom)
  const clusters = useAtomValue(activeClustersAtom)
  const setCluster = useSetAtom(clusterAtom)
  const setClusters = useSetAtom(clustersAtom)

  const value: ClusterProviderContext = {
    cluster,
    clusters: clusters.sort((a, b) => (a.name > b.name ? 1 : -1)),
    addCluster: (cluster_: Cluster) => {
      try {
        // eslint-disable-next-line no-new
        // new Connection(cluster_.endpoint)
        setClusters([...clusters, cluster_])
      } catch (err) {
        toast.error(`${err}`)
      }
    },
    deleteCluster: (cluster_: Cluster) => {
      setClusters(clusters.filter((item) => item.name !== cluster_.name))
    },
    setCluster: (cluster_: Cluster) => setCluster(cluster_),
    getExplorerUrl: (path: string) => `https://explorer.solana.com/${path}${getClusterUrlParam(cluster)}`,
  }
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useCluster() {
  return useContext(Context)
}
