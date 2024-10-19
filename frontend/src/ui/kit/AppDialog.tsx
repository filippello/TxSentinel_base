import { Dialog, DialogContent } from "@/components/ui/dialog"
import { IO, Unit } from "@/functional/functional"
import { State } from "@/functional/state"
import { Row } from "./Col"
import { AppButton } from "./Button"


export const AppDialogConfirm = (
  props: {
    open: State<boolean>
    title: string
    description: string
    acceptText: string
    onCancel?: IO<Unit>
    onAccept?: IO<Unit>
  }
) => {

  return <Dialog
    open={props.open.value}
    onOpenChange={it => props.open.update(() => it)()}
  >
    <DialogContent>

      <Row
        className="text-2xl font-bold text-center"
      >
        {props.title}
      </Row>

      <Row
        className="text-center"
      >
        {props.description}
      </Row>

      <Row
        className="flex flex-row justify-evenly py-2"
      >

        <AppButton
          className="bg-gray-50 hover:bg-gray-100 text-gray-900"
          onClick={props.open.update(() => false)}
        >
          Cancel
        </AppButton>

        <AppButton
          className="bg-red-600 hover:bg-red-700 text-white text-lg font-bold"
          onClick={props.onAccept}
        >
          {props.acceptText}
        </AppButton>
      </Row>

    </DialogContent>
  </Dialog>
}