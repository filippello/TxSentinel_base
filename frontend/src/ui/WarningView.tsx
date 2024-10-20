import { FaTriangleExclamation } from "react-icons/fa6"
import { ServerMessage } from "../model"
import { Col, Row } from "./kit/Col"
import { useEffect, useState } from "react"
import { Instant } from "@js-joda/core"
import { IO, Unit } from "../functional/functional"
import { AppButton } from "./kit/Button"
import { BrowserProvider } from "ethers"
import { useEnsLookup } from "@/hooks"



export const WarningView = (
  props: {
    warning: ServerMessage.TxWarning
    onCancel?: IO<Unit>
    onIgnore?: IO<Unit>
  }
) => {

  const now = useNow()

  const agentName = useEnsLookup(props.warning.agentAddress)

  return <Col
    className="items-stretch rounded-xl overflow-clip border w-full max-w-96"
  >
    <Col
      className="border-b border-gray-200 bg-red-600 px-4 pt-4 pb-2 gap-4"
    >

      <Row
        className="items-center justify-center gap-1 text-2xl font-bold text-white"
      >

        <FaTriangleExclamation/>

        <div>
          Tx Warning!
        </div>

      </Row>

      <div
        className="text-md text-white"
      >
        {relativeTimeString(now)(props.warning.timestamp)}
      </div>

    </Col>
    
    <Col
      className="p-4 gap-2 items-start"
    > 

      <div
        className="text-md font-normal"
      >
        From Agent: <br/>
        
      </div>

      <div
        className="font-mono text-gray-500 p-2 bg-gray-200 rounded-md items-center gap-2 overflow-ellipsis overflow-hidden max-w-full"
      >
        {agentName}
      </div>

      <div
        className="text-md font-normal"
      >
        Message: <br/>
        <b>{props.warning.message}</b>
      </div>

      <Row
        className="flex flex-row justify-evenly py-2 self-stretch"
      >
        <AppButton
          className="bg-gray-50 hover:bg-gray-100 text-gray-900"
          onClick={props.onIgnore}
        >
          Ignore
        </AppButton>

        <AppButton
          className="bg-gray-900 hover:bg-gray-700 text-white"
          onClick={props.onCancel}
        >
          Cancel Tx
        </AppButton>
      </Row>

    </Col>

    

  </Col>
}

const useNow = () => {
  const [now, setNow] = useState(() => Instant.now())
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Instant.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])
  return now
}


const relativeTimeString =
  (now: Instant) =>
  (instant: Instant) => {
    const diff = now.epochSecond() - instant.epochSecond()
    return `${Math.floor(diff)} seconds ago`
  }