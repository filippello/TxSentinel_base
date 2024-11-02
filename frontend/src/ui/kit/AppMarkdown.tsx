import Markdown from "react-markdown"
import { IO, Maybe, Unit } from "@/functional/functional"


export const AppMarkdown = (
  props: {
    children: string
    onRedirect?: (url: Maybe<string>) => IO<Unit>
  }
) => {

  return <Markdown
    className="prose font-normal"
    components={{
      a: ({ href, children }) => 
        <LinkWithWarning
          onRedirect={props.onRedirect}
          href={href} 
          children={children}
        />,
      link: ({ href, children }) => 
        <LinkWithWarning
          onRedirect={props.onRedirect}
          href={href} 
          children={children}
        />,
    }}
  >
    {props.children}
  </Markdown>
}


const LinkWithWarning = (
  props: {
    href: Maybe<string>
    children: React.ReactNode
    onRedirect?: (url: Maybe<string>) => IO<Unit>
  }
) => 
  <a 
    key={props.href}
    className="cursor-pointer"
    onClick={props.onRedirect?.(props.href)}
  >
    {props.children}
  </a>

