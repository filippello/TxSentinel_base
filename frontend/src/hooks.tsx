import { Maybe, none } from "./functional/functional"

export const novesOdosBot = "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955"

type Avatar = {
  avatarUrl?: string
  name: string
}

export const useEnsLookup = (address: string): Maybe<Avatar> => {
  

  return (
    address === novesOdosBot ? 
      {
        avatarUrl: "https://assets.odos.xyz/brandAssets/symbol/odos-symbol-orange.svg",
        name: "Noves Odos Bot",
      } :
    none
  )

  /*
  const provider = useBrowserProvider()

  const name = useAsyncData(
    async () => {
      return await provider.lookupAddress(address)
    },
    [address]
  )

  return name.value ?? address
  */
}
