import { useState } from "react"
import { IO, Unit } from "./functional"

export type State<T> = {
  value: T
  update: (transition: (prev: T) => T) => IO<Unit>
}

export const useStatefull = <T>(initial: IO<T>): State<T> => {

  const [state, setState] = useState(initial)

  return {
    value: state,
    update: (transition) => () => setState(transition)
  }
}



export const useIOValue = <T>(value: IO<T>): T => {

  const state = useStatefull(value)

  return state.value
}