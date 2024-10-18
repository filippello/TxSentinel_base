import { IO, Unit } from "./functional/functional"


export const notificationShow = (
  args: {
    message: string
  }
): IO<Unit> => 
() => {

  const notification = new Notification("TxSentinel Warning", { 
    icon: "alert.png",
    body: args.message
  })

  notification.onclick = () => {
    window.focus()
    notification.close()
  }
}
