import { none } from "./functional"

export type List<T> = ReadonlyArray<T>

export namespace List {

  export const groupByString =
    <T>(selector: (it: T) => string) =>
    (list: List<T>): Record<string, List<T>> => {

      const result: Record<string, T[]> = {}

      list.forEach(it => {
        const key = selector(it)
        
        if (result[key] === none) {
          result[key] = []
        }
        result[key].push(it)
      })

      return result
    }

}

