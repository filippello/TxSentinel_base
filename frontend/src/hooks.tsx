import { useAsyncData } from "./functional/AsyncData"
import { useBrowserProvider } from "./ui/AppContext"

export const useEnsLookup = (address: string): string => {
  
  const provider = useBrowserProvider()

  const name = useAsyncData(
    async () => {
      return await provider.lookupAddress(address)
    },
    [address]
  )

  return name.value ?? address
}
