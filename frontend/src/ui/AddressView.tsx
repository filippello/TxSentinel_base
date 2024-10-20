import { Row } from "./kit/Col"
import { FaWallet } from "react-icons/fa6"
import { useEnsLookup } from "@/hooks"



export const AddressView = (
  props: {
    address: string
  }
) => {

  const name = useEnsLookup(props.address)

  return <Row
    className="font-mono text-gray-500 text-sm p-2 bg-gray-200 rounded-md items-center gap-2"
  >
    <FaWallet/>
    {name}
  </Row>
}

