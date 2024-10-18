import { useAutoAnimate } from "@formkit/auto-animate/react"
import { BrowserProvider } from "ethers"
import { useEffect } from "react"
import { FaArrowRightArrowLeft, FaEthereum } from "react-icons/fa6"
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { twMerge } from "tailwind-merge"
import { useAsynchronism } from "./functional/asynchronism"
import { IO, Maybe, none, Unit } from "./functional/functional"
import { useIOValue, useStatefull } from "./functional/state"
import { ServerMessage } from "./model"
import { notificationShow } from "./notification"
import { AppAction, AppState } from "./state"
import { AppButton } from "./ui/Button"
import { Col, Row } from "./ui/Col"
import { LoadingIcon } from "./ui/loading"
import { WarningView } from "./ui/WarningView"
import { showIf } from "./util"
import { websocketConnection } from "./websocket"
import { browserProvider, toastShow, websocketUrl } from "./window"
import { FaWallet } from "react-icons/fa6"



export const App = () => {

  const providerState = useIOValue<Maybe<BrowserProvider>>(browserProvider)

  return <>
    {
      providerState === none ? <NoProviderView/> :
      <AppWithProvider 
        provider={providerState}
      />
    }
    <ToastContainer />
  </>
}

export const AppWithProvider = (
  props: {
    provider: BrowserProvider
  }
) => {

  const {
    warnings,
    balanceEth,
    walletAddress,
    action,
    connect,
    connection
  } = useFeatures(props.provider)

  const [parent] = useAutoAnimate()

  return (
    <Col
      className="items-stretch justify-start h-screen"
    >

      <Row
        className="p-4 items-center justify-between border-b border-gray-200 bg-white"
      >
        
        <Col className="w-0 grow items-start">
        
          <Row
            className="items-center justify-center gap-2"
          >

            <img
              src="/avalanche.svg"
              className="h-10 w-10"
            />

            <div className="text-2xl font-bold">
              TxSentinel
            </div>

          </Row>

        </Col>


        <Col className="w-0 grow items-center">
          {
            balanceEth === none ? none :
            <Row className="items-center gap-2 font-bold">
              TxSentinel balance:
              <Row
              className="font-mono text-gray-500 text-sm p-2 bg-gray-200 rounded-md items-center gap-2"
            >
              <FaEthereum/>
              {balanceEth.toFixed(10)}
            </Row>
            </Row>
            
          }
        </Col>

        <Col className="w-0 grow items-end">
          {
            walletAddress === none ? none :
            <Row
              className="font-mono text-gray-500 text-sm p-2 bg-gray-200 rounded-md items-center gap-2"
            >
              <FaWallet/>
              {walletAddress}
            </Row>
          }
        </Col>

      </Row>

      {
        connection === none ? (
          <InitialView
            className="grow"
            loading={connect.type == "running"}
            onConnect={connect.run({})}
          />
        ) : (
        <Row
          ref={parent}
          className="flex-wrap gap-4 p-4 justify-center items-center grow"
        >

          {
            showIf(warnings.length === 0)(
              <EmptyView
                className="grow"
		            wallet={walletAddress}
              />
            )
          }

          {warnings.map(it => 
            <WarningView
              key={it.warningHash}
              warning={it}
              onIgnore={
                action({
                  type: "IgnoreWarning",
                  warningHash: it.warningHash
                })
              }
              onCancel={
                connection?.send({
                  type: "TxWarningAccept",
                  warningHash: it.warningHash
                })
              }
            />)
          }

        </Row>
        )
      }

    </Col>
  )
}


export const InitialView = (
  props: {
    className?: string
    loading?: boolean
    onConnect: IO<Unit>
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
      Connect to track transactions
    </div>
    <div className="text-gray-500">
      Connect to your Web3 wallet to see warnings
    </div>
    <AppButton
      className="hover:bg-gray-200 text-xl gap-2"
      onClick={props.onConnect}
    >
      {
        props.loading ?? false ?
          <LoadingIcon/> :
          <FaArrowRightArrowLeft/>
      }
      Connect
    </AppButton>
  </Col>
}


export const EmptyView = (
  props: {
    className?: string
    wallet: Maybe<string>
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
      Connected! Tracking transactions for
    </div>
    <Row className="text-gray-700 font-bold font-mono items-center gap-2">
      <FaWallet/>
      {props.wallet ?? "-"}
    </Row>
    <div className="text-gray-500">
      Agents are monitoring your transactions, you'll see warnings here
    </div>
    <LoadingIcon
      className="h-10 w-10"
    />
  </Col>
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


const useFeatures = (provider: BrowserProvider) => {

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
    const permission = await Notification.requestPermission()
    if (permission !== "granted") throw "Notifications permission denied"

    const connection = await websocketConnection({
      url: websocketUrl,
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

