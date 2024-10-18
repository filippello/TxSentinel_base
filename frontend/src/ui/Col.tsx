import React, { ComponentProps } from "react"

export const Row = React.forwardRef(
  (
    props: ComponentProps<"div">,
    ref: React.ForwardedRef<HTMLDivElement>
  ) =>
    <div
      {...props}
      ref={ref}
      className={`flex flex-row ${props.className ?? ""}`}
    />
)

export const Col = React.forwardRef(
  (
    props: ComponentProps<"div">,
    ref: React.ForwardedRef<HTMLDivElement>
  ) =>
    <div
      {...props}
      ref={ref}
      className={`flex flex-col ${props.className ?? ""}`}
    />
)

