import { WebSocketServer } from "ws"
import { delayMillis } from "../src/functional/functional"
import { ServerMessage } from "../src/model"
import { keccak256, toUtf8Bytes } from "ethers"
import { Instant } from "@js-joda/core"
import { Value } from "@sinclair/typebox/value"

export const main =
  () => {

    let i = 0

    const wss = new WebSocketServer({ port: 8089 })

    wss.on("connection", async (ws) => {


      const sendMessage = (message: ServerMessage) => 
        () => {
          const data = JSON.stringify(Value.Encode(ServerMessage.Any, message))
          console.log(`>>>>>>>>> ${data}`)
          ws.send(data)
        }

      console.log("New connection")

      ws.on("message", it => {
        console.log(`<<<<<<<<< ${it.toString("utf8")}`)
      })

      ws.on("close", () => {
        console.log("Connection closed")
      })

      const randomEth = () => Math.random() * 10

      sendMessage({
        type: "WalletBalance",
        amountEth: randomEth()
      })()

      const txHash = keccak256(toUtf8Bytes(`tx`))

      while(true) {
        await delayMillis(10 * 1000)()
        

        const hash = keccak256(toUtf8Bytes(`${i}`))

        const now = Instant.now()

        sendMessage({
          type: "WalletBalance",
          amountEth: randomEth()
        })()

        sendMessage({
          type: "TxWarning",
          timestamp: now,
          txHash: txHash,
          agentAddress: 
            Math.random() < 0.5 ?
            "0x1CADAdF0e884aC5527Ae596A4fc1017a4fFD4e2C" :
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", // vitalik.eth
          warningHash: hash,
          message: "Suspicious address"
        })()

        i++
      }
    })

    console.log("Listening on port 8089")

  }


main()
