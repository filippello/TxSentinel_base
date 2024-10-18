import { Async, IO, None, Unit } from "./functional"
import { useStatefull } from "./state"


export type AsynchronismState<I, O> = 
  {
    type: "idle"
    input?: None
    output?: None
  }
  | {
    type: "running"
    param: I
    output?: None
  }
  | {
    type: "success"
    param: I
    output: O
  }
  | {
    type: "error"
    param: I
    output?: None
    error: unknown
  }

export const useAsynchronism = <I, O>(
  body: (param: I) => Async<O>,
  args?: {
    onSuccess?: (value: AsynchronismState<I, O> & { type: "success" }) => IO<Unit>
    onError?: (error: AsynchronismState<I, O> & { type: "error" }) => IO<Unit>
  }
) => {

  type State = AsynchronismState<I, O>

  const state = useStatefull<State>(
    () => ({
      type: "idle"
    })
  )

  const run = (param: I) => 
    async () => {
      state.update(() => ({
        type: "running",
        param
      }))()
      try {
        const output = await body(param)()
        const newState: State = {
          type: "success",
          param,
          output
        }
        state.update(() => newState)()
        args?.onSuccess?.(newState)()
        return output
      } catch (e) {
        const newState: State = {
          type: "error",
          param,
          error: e
        }
        state.update(() => newState)()
        args?.onError?.(newState)()
      }
    }

  const status = state.value

  return {
    ...status,
    run: 
      status.type === "running" ? () => Async.noOp :
      run,

    reset: status.type === "running" ? () => Async.noOp :
      state.update(() => ({ type: "idle" }))
  }
}

