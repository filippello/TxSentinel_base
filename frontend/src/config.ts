import { List } from "./functional/list"

export type Config = {
  sentinelUrl: string
  rpcConfig?: {
    chainId: string
    chainName: string
    nativeCurrency: {
      name: string
      symbol: string
      decimals: number
    }
    rpcUrls: List<string>
    blockExplorerUrls: List<string>
  }
}

export const localConfig: Config = {
  sentinelUrl: "ws://localhost:8089/client/",
}

export const sepoliaConfig: Config = {
  sentinelUrl: "wss://securerpc.filicodelab.xyz/client/",
  rpcConfig: {
    chainId: "0x14a34",
    chainName: "TxSentinel Base Sepolia",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: [
      "https://securerpc.filicodelab.xyz/"
    ],
    blockExplorerUrls: [
      "https://sepolia.basescan.org/"
    ],
  }
}

export const polygonConfig: Config = {
  sentinelUrl: "wss://securerpc.filicodelab.xyz/client/",
  rpcConfig: {
    chainId: "0x89",
    chainName: "TxSentinel Polygon",
    nativeCurrency: {
      name: "POLYGON",
      symbol: "POL",
      decimals: 18,
    },
    rpcUrls: [
      "https://securerpc.filicodelab.xyz/"
    ],
    blockExplorerUrls: [
      "https://polygonscan.com/"
    ],
  }
}

const env = import.meta.env.VITE_ENV

export const config: Config = 
  env === "polygon" ? polygonConfig :
  env === "sepolia" ? sepoliaConfig :
  localConfig

