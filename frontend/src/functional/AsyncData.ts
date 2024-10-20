import { useEffect } from "react"
import { Async, None } from "./functional"
import { List } from "./list"
import { useStatefull } from "./state"


export type AsyncData<T> =
  | {
    type: "loading"
    value?: None
    error?: None
  }
  | {
    type: "success"
    value: T
    error?: None
  }
  | {
    type: "error"
    value?: None
    error: unknown
  }


export const useAsyncData = <T>(
  value: Async<T>,
  dependencies?: List<unknown>
) => {

  const state = useStatefull<AsyncData<T>>(
    () => ({
      type: "loading"
    })
  )

  const run =
    async () => {
      try {
        const result = await value()
        state.update(() => ({
          type: "success",
          value: result
        }))()
      } catch (e) {
        state.update(() => ({
          type: "error",
          error: e
        }))()
      }
    }

  useEffect(
    () => {
      run()
    },
    dependencies
  )

  return state.value
}
