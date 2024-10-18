
export type None = undefined
export const none = undefined

export type Unit = void
export const unit: Unit = undefined

export type Maybe<T> = T | None

export type List<T> = ReadonlyArray<T>


export const throws = (message: string): never => {
  throw new Error(message)
}


export type Async<T> = () => Promise<T>

export namespace Async {

  export const noOp: Async<Unit> = async () => {}

}

export type IO<T> = () => T

export namespace IO {

  export const noOp: IO<Unit> = () => {}

}

export const match = 
  <T extends { type: string }>(value: T) =>
  <R>(cases: {
    [K in T["type"]]: (value: T & { type: K }) => R
  }): R =>
    (cases as any)[value.type](value)


export const delayMillis =
  (millis: number): Async<Unit> =>
  () => new Promise(resolve => setTimeout(resolve, millis))
