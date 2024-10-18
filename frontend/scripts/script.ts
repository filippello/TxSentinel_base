import { pipe } from "../src/functional/functional"
import { List } from "../src/functional/list"



const main = 
  () => {

    const list = [
      {
        a: "asdasd",
        b: "asdasd"
      },
      {
        a: "asdasd",
        b: "asdasdsadfasd"
      },
      {
        a: "asd",
        b: "asdsd"
      },
    ]

    const grouped = pipe(list)(
      List.groupByString(it => it.a)
    )

    console.log(grouped)

  }


main()

