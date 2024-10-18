import { IsString, Value } from "@sinclair/typebox/value"
import { Async, IO, Unit } from "./functional/functional"
import { ClientMessage, ServerMessage } from "./model"

export type WebSocketConnection = {
  send: (message: ClientMessage) => IO<Unit>
  close: IO<Unit>
}

export const websocketConnection =
  (
    args: {
      url: string
      onMessage: (message: ServerMessage) => IO<Unit>
      onConnected?: (error: Event) => IO<Unit>
      onError?: (error: Event) => IO<Unit>
      onClose?: (event: CloseEvent) => IO<Unit>
    }
  ): Async<WebSocketConnection> =>
  async () => {

    const onError = args.onError ?? (() => IO.noOp)
    const onClose = args.onClose ?? (() => IO.noOp)

    const socket = new WebSocket(args.url)

    await new Promise((resolve, reject) => {
      socket.onopen = resolve
      socket.onerror = event => {
        reject("Could not establish connection")
      }
    })

    socket.onmessage = event => {
      const payload = event.data
      if (!IsString(payload)) return
      try {
        const parsed = Value.Parse(ServerMessage.Any, JSON.parse(payload))
        args.onMessage(parsed)()
      } catch (e) {
        console.error(e)
      }
    }

    socket.onerror = event => {
      onError(event)()
    }
    socket.onclose = event => {
      onClose(event)()
    }

    return {
      close: () => socket.close(),
      send: (message: ClientMessage) =>
        () => {
          socket.send(
            JSON.stringify(message)
          )
        }
    }

  }
