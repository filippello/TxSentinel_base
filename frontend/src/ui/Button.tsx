import React from "react"
import { twMerge } from "tailwind-merge"

export const AppButton = (
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) => {

  return <button
    {...props}
    className={
      twMerge(
        "flex flex-row gap-1 items-center border rounded-md p-2",
        props.className
      )
    }
  >
    {props.children}
  </button>
}
