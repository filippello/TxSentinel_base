import { Instant } from "@js-joda/core"
import { Value } from "@sinclair/typebox/value"
import { TInstant } from "../src/model"


export const main = 
  () => {

    const instant = Instant.now()

    const encoded = Value.Encode(TInstant, instant)

    console.log(encoded)

    const decoded = Value.Decode(TInstant, encoded)

    console.log(decoded)

  }

main()

