import { Maybe, none } from "@/functional/functional"
import { Col, Row } from "./kit/Col"
import { FaEthereum } from "react-icons/fa6"
import { AddressView } from "./AddressView"


export const AppHeader = (
  props: {
    balanceEth: Maybe<number>
    walletAddress: Maybe<string>
  }
) => {

  return <Row
    className="p-4 items-center justify-between border-b border-gray-200 bg-white"
  >
    
    <Col className="w-0 grow items-start">
    
      <Row
        className="items-center justify-center gap-2"
      >

        <img
          src="/base-chain.png"
          className="h-10 w-10"
        />

        <div className="text-2xl font-bold">
          TxSentinel
        </div>

      </Row>

    </Col>


    <Col className="w-0 grow items-center">
      {
        props.balanceEth === none ? none :
        <Row className="items-center gap-2 font-bold">
          TxSentinel balance:
          <Row
          className="font-mono text-gray-500 text-sm p-2 bg-gray-200 rounded-md items-center gap-2"
        >
          <FaEthereum/>
          {props.balanceEth.toFixed(10)}
        </Row>
        </Row>
      }
    </Col>

    <Col className="w-0 grow items-end">
      {
        props.walletAddress === none ? none :
        <AddressView
          address={props.walletAddress}
        />
      }
    </Col>

  </Row>
}

