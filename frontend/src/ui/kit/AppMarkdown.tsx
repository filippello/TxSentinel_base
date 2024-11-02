import Markdown from "react-markdown"


export const AppMarkdown = (
  props: {
    children: string
  }
) => {

  return <Markdown
    className="prose font-normal"
    components={{
      a: ({ href, children }) => 
        <a href={href} target="_blank" rel="noreferrer">{children}</a>,
      link: ({ href, children }) => 
        <a href={href} target="_blank" rel="noreferrer">{children}</a>,
    }}
  >
    {props.children}
  </Markdown>
}
