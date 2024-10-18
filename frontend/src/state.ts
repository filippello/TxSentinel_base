import { List, match, Maybe, none } from "./functional/functional"
import { ServerMessage } from "./model"

export type Reducer<I, S> = (action: I) => (state: S) => S

export type AppState =
  {
    balanceEth: Maybe<number>
    warnings: List<ServerMessage.TxWarning>
  }


export type AppAction =
  | {
    type: "ServerMessage",
    message: ServerMessage.Any
  }
  | {
    type: "IgnoreWarning",
    warningHash: string
  }


export namespace AppState {

  export const initial: AppState = {
    balanceEth: none,
    warnings: []
  }


  export const reducer: Reducer<AppAction, AppState> =
    action => state =>
      match(action)({

        ServerMessage: action => 
          match(action.message)<AppState>({

            WalletBalance: message => 
              ({
                ...state,
                balanceEth: message.amountEth
              }),

            TxWarning: message => 
              ({
                ...state,
                warnings: state.warnings.some(it => it.txHash === message.txHash) ?
                  state.warnings.map(it => it.txHash === message.txHash ? message : it) :
                  [...state.warnings, message]
              }),

            TxDone: message => ({
              ...state,
              warnings: state.warnings.filter(it => it.txHash !== message.txHash)
            }),


          }),

        IgnoreWarning: action =>
          ({
            ...state,
            warnings: state.warnings.filter(it => it.warningHash !== action.warningHash)
          })
        
      })


}
