import { Instant } from "@js-joda/core"
import { match, Maybe, none } from "./functional/functional"
import { List } from "./functional/list"
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

  const empty: AppState = 
    ({
      balanceEth: none,
      warnings: []
    })

  const mock: AppState =
    ({
      balanceEth: 1,
      warnings: [
        {"type":"TxWarning","timestamp":Instant.now(),"txHash":"0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6","agentAddress":"0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6","warningHash":"0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6","message":"Suspicious address"},
        {"type":"TxWarning","timestamp":Instant.now(),"txHash":"0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6","agentAddress":"0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6","warningHash":"0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bca","message":"Suspicious address"},
      ]
    })

  export const initial: AppState = empty


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
                warnings: 
                  state.warnings.some(it => it.warningHash === message.warningHash) ?
                  state.warnings.map(it => it.warningHash === message.warningHash ? message : it) :
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
