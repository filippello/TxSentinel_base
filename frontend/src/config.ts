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

export const config: Config = 
  import.meta.env.VITE_ENV === "sepolia" ? sepoliaConfig :
  localConfig

