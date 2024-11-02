import { FaTriangleExclamation } from "react-icons/fa6"
import { ServerMessage } from "../model"
import { Col, Row } from "./kit/Col"
import { useEffect, useState } from "react"
import { Instant } from "@js-joda/core"
import { IO, none, Unit } from "../functional/functional"
import { AppButton } from "./kit/Button"
import { novesOdosBot, useEnsLookup } from "@/hooks"
import { AppMarkdown } from "./kit/AppMarkdown"
import { AppDialogConfirm } from "./kit/AppDialog"
import { useStatefull } from "@/functional/state"


export const WarningView = (
  props: {
    warning: ServerMessage.TxWarning
    onCancel?: IO<Unit>
    onIgnore?: IO<Unit>
  }
) => {

  const now = useNow()

  const showWarning = useStatefull(() => false)
  const redirectUrl = useStatefull(() => "")

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
        className="text-md"
      >
        From Agent: <br/>
      </div>

      <AgentView
        agentAddress={props.warning.agentAddress}
      />

      <Col>
        <div className="text-md font-normal">
          Message:
        </div>
        <AppMarkdown
          onRedirect={url =>
            url === none ? IO.noOp :
            () => {
              redirectUrl.update(() => url)()
              showWarning.update(() => true)()
            }
          }
        >
          {props.warning.message}
        </AppMarkdown>
      </Col>

      <Row
        className="flex flex-row justify-evenly py-2 self-stretch font-bold"
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

    <AppDialogConfirm
      open={showWarning}
      title="Cancel the Tx and open the link?"
      description={
        props.warning.agentAddress === novesOdosBot ?
        "This will cancel the transaction and open the link in a new tab. The cancellation cost will be covered by the Noves Odos Bot." :
        "This will cancel the transaction and open the link in a new tab."
      }
      rejectText="Close"
      acceptText="Yes, cancel the Tx"
      onCancel={showWarning.update(() => false)}
      onAccept={
        () => {
          showWarning.update(() => false)()
          props.onCancel?.()
          window.open(redirectUrl.value, "_blank")
        }
      }
    />

  </Col>
}



const AgentView = (
  props: {
    agentAddress: string
  }
) => {

  const agentAddress = props.agentAddress

  const avatar = useEnsLookup(agentAddress)

  return avatar !== none ?
    <Row
      className="items-center gap-2"
    >
      <img
        src={avatar.avatarUrl}
        className="h-10 w-10 rounded-full"
      />
      <div
        className="text-lg font-bold text-gray-900 p-2 overflow-ellipsis overflow-hidden max-w-full "
      >
        {avatar.name}
      </div>
    </Row> :
    <div
      className="font-mono font-bold text-gray-500 p-2 bg-gray-200 rounded-md overflow-ellipsis overflow-hidden max-w-full"
    >
      {agentAddress}
    </div>
  
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