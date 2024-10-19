import { ethers } from "ethers"
import { IO, Maybe, none, throws, Unit } from "./functional/functional"
import { BrowserProvider } from "ethers"
import { toast, TypeOptions } from "react-toastify"

export const ethereum: Maybe<ethers.Eip1193Provider> = (window as any).ethereum

const baseEns = {
  ensNetwork: 8453,
  ensAddress: "0xb94704422c2a1e396835a571837aa5ae53285a95"
}

export const browserProvider: IO<Maybe<BrowserProvider>> =
  () => {
    try {
      return new ethers.BrowserProvider(ethereum ?? throws("No ethereum"), /*baseEns*/)
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
