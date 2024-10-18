import { twMerge } from "tailwind-merge"
import { IO, Unit } from "../functional/functional"
import { Col } from "./kit/Col"
import { AppButton } from "./kit/Button"
import { LoadingIcon } from "./kit/loading"
import { FaArrowRightArrowLeft } from "react-icons/fa6"



export const InitialView = (
  props: {
    className?: string
    loading?: boolean
    onConnect: IO<Unit>
  }
) => {

  return <Col 
    className={
      twMerge(
        "p-4 items-center justify-center gap-4",
        props.className
      )
    }
  >
    <div className="text-2xl font-bold">
      Connect to track transactions
    </div>
    <div className="text-gray-500">
      Connect to your Web3 wallet to see warnings
    </div>
    <AppButton
      className="hover:bg-gray-200 text-xl gap-2"
      onClick={props.onConnect}
    >
      {
        props.loading ?? false ?
          <LoadingIcon/> :
          <FaArrowRightArrowLeft/>
      }
      Connect
    </AppButton>
  </Col>
}
