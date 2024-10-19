import { useAutoAnimate } from "@formkit/auto-animate/react"
import { IO, Unit } from "../functional/functional"
import { List } from "../functional/list"
import { ServerMessage } from "../model"
import { Col, Row } from "./kit/Col"
import { FaTriangleExclamation } from "react-icons/fa6"
import { WarningView } from "./WarningView"
import { AppButton } from "./kit/Button"
import { State, useStatefull } from "@/functional/state"
import { AppDialogConfirm } from "./kit/AppDialog"



export const TxWarningsView = (
  props: {
    txHash: string
    warnings: List<ServerMessage.TxWarning>
    onTxSend?: IO<Unit>
    onWarningIgnore?: (warningHash: string) => IO<Unit>
    onWarningCancel?: (warningHash: string) => IO<Unit>
  }
) => {

  const openSendTxDialog = useStatefull(() => false)

  const [parent] = useAutoAnimate()

  return <Col
    className="w-full items-stretch gap-4"
  >


      <Row
        className="items-center justify-between gap-1"
      >

        <Col>
        
          <Row
            className="items-center gap-1 text-2xl font-bold"
          >
            <FaTriangleExclamation/> Your Transaction has Warnings! 
            
          </Row>

          <Row
            className="gap-2 items-center"
          >
            TxHash: <a className="font-mono text-gray-600 pt-1">{props.txHash}</a>
          </Row>

        </Col>
        

        <AppButton
            className="bg-red-600 hover:bg-red-700 text-white text-lg font-bold"
            onClick={openSendTxDialog.update(() => true)}
        >
          Ignore All and Send Tx
        </AppButton>

      </Row>

      <Row
        ref={parent} 
        className="justify-center gap-2 font-bold flex-wrap"
      >

        {
          props.warnings.map(it => 
            <WarningView
              key={it.warningHash}
              warning={it}
              onIgnore={props.onWarningIgnore?.(it.warningHash)}
              onCancel={props.onWarningCancel?.(it.warningHash)}
            />
          )
        }

      </Row>

      <AppDialogConfirm
        open={openSendTxDialog}
        title="Are you sure you want to send this transaction?"
        description="This will send the transaction to the network and you will not be able to cancel it."
        acceptText="Yes, send transaction"
        onCancel={openSendTxDialog.update(() => false)}
        onAccept={props.onTxSend}
      />

    </Col>
}


