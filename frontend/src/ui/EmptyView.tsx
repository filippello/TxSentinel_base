import { twMerge } from "tailwind-merge"
import { Maybe } from "../functional/functional"
import { Col, Row } from "./kit/Col"
import { FaWallet } from "react-icons/fa6"
import { LoadingIcon } from "./kit/loading"



export const EmptyView = (
  props: {
    className?: string
    wallet: Maybe<string>
  }
) => {

  return <Col
    className={
      twMerge(
        "p-4 items-center justify-center gap-4 w-full h-full",
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

