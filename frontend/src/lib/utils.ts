import { List } from "@/functional/list"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const cn = (...inputs: List<ClassValue>): string => twMerge(clsx(inputs))

