import { DateTimeFormatter, Instant, LocalDateTime, ZoneId, ZoneOffset } from "@js-joda/core"
import { StaticDecode, Transform, Type } from "@sinclair/typebox"


export const TInstant = 
  Transform(Type.String())
    .Decode(it => LocalDateTime.from(DateTimeFormatter.ISO_LOCAL_DATE_TIME.parse(it)).toInstant(ZoneOffset.UTC))
    .Encode(it => DateTimeFormatter.ISO_LOCAL_DATE_TIME.format(it.atZone(ZoneId.UTC)))


export namespace ServerMessage {

  export const WalletBalance =
  Type.Object({
    type: Type.Literal("WalletBalance"),
    amountEth: Type.Number()
  })
  export type WalletBalance = StaticDecode<typeof WalletBalance>

  export const TxWarning =
    Type.Object({
      type: Type.Literal("TxWarning"),
      timestamp: TInstant,
      txHash: Type.String(),
      agentAddress: Type.String(),
      warningHash: Type.String(),
      message: Type.String()
    })
  export type TxWarning = StaticDecode<typeof TxWarning>

  export const TxDone =
    Type.Object({
      type: Type.Literal("TxDone"),
      txHash: Type.String(),
    })
  export type TxDone = StaticDecode<typeof TxDone>

  export const Any = Type.Union([
    WalletBalance,
    TxWarning,
    TxDone,
  ])
  export type Any = StaticDecode<typeof Any>
}

export type ServerMessage = ServerMessage.Any

export namespace ClientMessage {

  export const WalletTrack =
    Type.Object({
      type: Type.Literal("WalletTrack"),
      address: Type.String()
    })
  export type WalletTrack = StaticDecode<typeof WalletTrack>

  export const TxAllow =
    Type.Object({
      type: Type.Literal("TxAllow"),
      txHash: Type.String()
    })
  export type TxAllow = StaticDecode<typeof TxAllow>

  export const TxWarningAccept =
    Type.Object({
      type: Type.Literal("TxWarningAccept"),
      warningHash: Type.String()
    })
  export type TxWarningAccept = StaticDecode<typeof TxWarningAccept>

  export const Any = Type.Union([
    WalletTrack,
    TxAllow, 
    TxWarningAccept
  ])
  export type Any = StaticDecode<typeof Any>

}

export type ClientMessage = ClientMessage.Any
