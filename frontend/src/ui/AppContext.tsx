import { Maybe, none, throws } from "@/functional/functional"
import { BrowserProvider } from "ethers"
import React from "react"

export type AppContext = {
  provider: BrowserProvider
}


export const AppContextReact = React.createContext<Maybe<AppContext>>(none)

export const useAppContext = () => {
  return React.useContext(AppContextReact) ?? throws("No app context")
}

export const useBrowserProvider = () => {
  return useAppContext().provider
}

