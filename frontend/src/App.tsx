import { useAutoAnimate } from "@formkit/auto-animate/react"
import { BrowserProvider } from "ethers"
import { useEffect } from "react"
import { FaEthereum, FaWallet } from "react-icons/fa6"
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { twMerge } from "tailwind-merge"
import { useAsynchronism } from "./functional/asynchronism"
import { IO, Maybe, none, pipe, Unit } from "./functional/functional"
import { List } from "./functional/list"
import { useIOValue, useStatefull } from "./functional/state"
import { ServerMessage } from "./model"
import { notificationShow } from "./notification"
import { AppAction, AppState } from "./state"
import { Col, Row } from "./ui/kit/Col"
import { showIf } from "./util"
import { websocketConnection } from "./websocket"
import { browserProvider, ethereum, toastShow } from "./window"
import { InitialView } from "./ui/InitialView"
import { EmptyView } from "./ui/EmptyView"
import { TxWarningsView } from "./ui/TxWarningsView"
import { AppHeader } from "./ui/AppHeader"
import { AppContextReact, useBrowserProvider } from "./ui/AppContext"
import { config } from "./config"



export const App = () => {

  const provider = useIOValue<Maybe<BrowserProvider>>(browserProvider)

  return <>
    {
      provider === none ? <NoProviderView/> :
      <AppContextReact.Provider 
        value={{
          provider: provider
        }}
      >
        <AppWithProvider/>
      </AppContextReact.Provider>
    }
    <ToastContainer />
  </>
}

export const AppWithProvider = () => {

  const {
    warnings,
    balanceEth,
    walletAddress,
    action,
    connect,
    connection
  } = useFeatures()

  const [parent] = useAutoAnimate()

  const warningsByTx = pipe(warnings)(
    List.groupByString(it => it.txHash),
    it => Object.entries(it)
  )

  return (
    <Col
      className="items-stretch justify-start h-screen"
    >

      <AppHeader
        balanceEth={balanceEth}
        walletAddress={walletAddress}
      />

      {
        connection === none ? (
          <InitialView
            className="grow"
            loading={connect.type == "running"}
            onConnect={connect.run({})}
          />
        ) : (
        <Col
          ref={parent}
          className="flex-wrap gap-4 p-4 justify-start items-start grow"
        >

          {
            showIf(warnings.length === 0)(
              <EmptyView
                className="grow"
		            wallet={walletAddress}
              />
            )
          }

          {
            warningsByTx.map(([txHash, warnings]) =>
              <TxWarningsView
                key={txHash}
                txHash={txHash}
                warnings={warnings}
                onTxSend={
                  connection?.send({
                    type: "TxAllow",
                    txHash: txHash
                  })
                }
                onWarningIgnore={warningHash =>
                  action({
                    type: "IgnoreWarning",
                    warningHash: warningHash
                  })
                }
                onWarningCancel={warninghash => 
                  connection?.send({
                    type: "TxWarningAccept",
                    warningHash: warninghash
                  })
                }
              />
            )
          }
        </Col>
        )
      }

    </Col>
  )
}






export const NoProviderView = (
  props: {
    className?: string
  }
) => {

  return <Col 
    className={
      twMerge(
        "p-4 items-center justify-center gap-4",
        props.className
      )
    }
  >
    <div className="text-2xl font-bold">
      No Web3 Wallet detected...
    </div>
    <div className="text-gray-500">
      Install a Web3 wallet to use this DApp
    </div>
  </Col>
}


const useFeatures = () => {

  const provider = useBrowserProvider()

  const state = useStatefull<AppState>(() => AppState.initial)

  const action = (action: AppAction) => state.update(AppState.reducer(action))

  const connect = useAsynchronism(
    () =>
      trackingStart(provider)({
        onMessage: 
          message => 
            () => {
              action({
                type: "ServerMessage",
                message: message
              })()
              if (message.type === "TxWarning") {
                notificationShow({
                  message: "TxSentinel Warning! Click to see details"
                })()
              }
            },
          onClose: reason =>
            () => {
              connect.reset()
              state.update(() => AppState.initial)()
              toastShow("error")(`Connection with TxSentinel lost: ${reason}`)()
              if(!document.hasFocus()) { 
                notificationShow({
                  message: "TxSentinel Disconnected! Click to reconnect"
                })()
              }
            }
      }),
    {
      onError: state => toastShow("error")(`Error: ${state.error}`)
    }
  )

  const connection = connect.output?.connection

  useEffect(
    connection === none ? IO.noOp :  
    () => {
      return connection?.close
    }, 
    [connect.type]
  )

  return {
    warnings: state.value.warnings,
    balanceEth: state.value.balanceEth,
    walletAddress: connect.output?.wallet,
    action: action,
    connect,
    connection: connection
  }
}


const trackingStart =
  (provider: BrowserProvider) => 
  (
    args: {
      onMessage: (message: ServerMessage) => IO<Unit>
      onClose: (reason: string) => IO<Unit>
    }
  ) =>
  async () => {

    const signer = await provider.getSigner()

    if (config.rpcConfig !== none) {
      await ethereumChainAdd(config.rpcConfig)()
    }

    const permission = await Notification.requestPermission()
    if (permission !== "granted") throw "Notifications permission denied"

    const connection = await websocketConnection({
      url: config.sentinelUrl,
      onMessage: args.onMessage,
      onClose: event => 
          args.onClose(event.reason === "" ? "Connection error" : event.reason)
    })()

    connection.send({
      type: "WalletTrack",
      address: signer.address
    })()

    return {
      wallet: signer.address,
      connection: connection
    }
  }



const ethereumChainAdd = 
  (
    args: {
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
  ) => 
  async () => {

    if (ethereum == none) return

    try {

      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [args],
      })

    } catch (e) {
      console.error(e)
      throw e
    }

  }
