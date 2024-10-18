import { Maybe, none } from "./functional/functional"

export const showIf = 
  (condition: boolean) =>
  <T>(value: T): Maybe<T> =>
    condition ? value : none

