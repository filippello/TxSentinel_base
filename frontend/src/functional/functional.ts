import { List } from "./list"

export type None = undefined
export const none = undefined

export type Unit = void
export const unit: Unit = undefined

export type Maybe<T> = T | None

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


export const pipe = 
  <T1>(value: T1): {
    (): T1
    <T2>(
      f1: (it: T1) => T2
    ): T2
    <T2, T3>(
      f1: (it: T1) => T2,
      f2: (it: T2) => T3
    ): T3
    <T2, T3, T4>(
      f1: (it: T1) => T2,
      f2: (it: T2) => T3,
      f3: (it: T3) => T4
    ): T4
    <T2, T3, T4, T5>(
      f1: (it: T1) => T2,
      f2: (it: T2) => T3,
      f3: (it: T3) => T4,
      f4: (it: T4) => T5
    ): T5
    <T2, T3, T4, T5, T6>(
      f1: (it: T1) => T2,
      f2: (it: T2) => T3,
      f3: (it: T3) => T4,
      f4: (it: T4) => T5,
      f5: (it: T5) => T6
    ): T6
    <T2, T3, T4, T5, T6, T7>(
      f1: (it: T1) => T2,
      f2: (it: T2) => T3,
      f3: (it: T3) => T4,
      f4: (it: T4) => T5,
      f5: (it: T5) => T6,
      f6: (it: T6) => T7
    ): T7
  } =>
  (...fns: List<(it: any) => any>) => 
    fns.reduce((acc, fn) => fn(acc), value)

  
