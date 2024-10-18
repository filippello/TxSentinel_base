import { ethers } from "ethers"
import { IO, Maybe, none, throws, Unit } from "./functional/functional"
import { BrowserProvider } from "ethers"
import { toast, TypeOptions } from "react-toastify"

export const websocketUrl = import.meta.env.VITE_WEBSOCKET_URL ?? "ws://localhost:8080/client/"

export const ethereum: Maybe<ethers.Eip1193Provider> = (window as any).ethereum

export const browserProvider: IO<Maybe<BrowserProvider>> =
  () => {
    try {
      return new ethers.BrowserProvider(ethereum ?? throws("No ethereum"))
    } catch (e) {
      console.error(e)
      return none
    }
  }


export const toastShow =
  (type: TypeOptions) =>
  (message: string): IO<Unit> =>
  () => {
    toast(message, { theme: "colored", type: type, position: "bottom-center" })
  }
