import { StaticDecode, Type } from "@sinclair/typebox"

const TxNew = Type.Object({
  unsignedTx: Type.String()
})
export type TxNew = StaticDecode<typeof TxNew>

const main = 
  async () => {

    const rpc = "wss://securerpc.filicodelab.xyz/agent/"

    const ws = new WebSocket(rpc)

    await new Promise((resolve, reject) => {
      ws.onopen = resolve
      ws.onerror = reject
    })


    ws.onmessage =
      message => {

        

      }

    
  }


main()

