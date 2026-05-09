// TipTap JSON → JSX. Server component. No editor runtime in the
// reader bundle. Extend the switch when adding node types.
import type { ReactNode } from "react";
import type { TipTapNode, TipTapDoc, TipTapMark } from "./types";
import { CfStreamPlayer } from "@/components/lms/cf-stream-player";

export function LessonBody({ doc }: { doc: TipTapDoc }) {
  return (
    <div className="lms-prose">
      {doc.content?.map((n, i) => <RenderNode key={i} node={n} />)}
    </div>
  );
}

function RenderNode({ node }: { node: TipTapNode }): ReactNode {
  switch (node.type) {
    case "paragraph":
      return (
        <p className="text-[1.05rem] leading-[1.65] text-black mb-5">
          {node.content?.map((n, i) => <RenderNode key={i} node={n} />)}
        </p>
      );

    case "heading": {
      const level = node.attrs.level;
      const classes =
        level === 1
          ? "text-3xl font-bold text-black mt-10 mb-5 leading-tight"
          : level === 2
          ? "text-2xl font-bold text-black mt-9 mb-4 leading-snug"
          : "text-lg font-bold text-black mt-7 mb-3";
      const Tag = (`h${level}` as "h1" | "h2" | "h3");
      return (
        <Tag className={classes}>
          {node.content?.map((n, i) => <RenderNode key={i} node={n} />)}
        </Tag>
      );
    }

    case "bulletList":
      return (
        <ul className="list-disc pl-6 my-5 space-y-2 text-[1.05rem] leading-[1.65] text-black marker:text-[#0066FF]">
          {node.content?.map((n, i) => <RenderNode key={i} node={n} />)}
        </ul>
      );

    case "orderedList":
      return (
        <ol className="list-decimal pl-6 my-5 space-y-2 text-[1.05rem] leading-[1.65] text-black">
          {node.content?.map((n, i) => <RenderNode key={i} node={n} />)}
        </ol>
      );

    case "listItem":
      return (
        <li>
          {node.content?.map((n, i) => (
            // Inside a <li>, paragraphs should not add their own bottom
            // margin — strip it for the cleanest look.
            <ListItemChild key={i} node={n} />
          ))}
        </li>
      );

    case "callout": {
      const variant = node.attrs.variant;
      const classes =
        variant === "signal"
          ? "bg-[#0066FF] text-white"
          : variant === "rose"
          ? "bg-[#FAEBE1] text-[#733D29]"
          : "bg-[#733D29] text-[#FAEBE1]";
      return (
        <div className={`${classes} rounded-[10px] px-6 py-5 my-6 text-center font-bold leading-[1.65]`}>
          {node.content?.map((n, i) => (
            <CalloutChild key={i} node={n} />
          ))}
        </div>
      );
    }

    case "video":
      return (
        <div className="my-6">
          <CfStreamPlayer videoId={node.attrs.cfStreamVideoId} />
        </div>
      );

    case "text":
      return renderText(node.text, node.marks);

    case "doc":
      return node.content?.map((n, i) => <RenderNode key={i} node={n} />);

    default:
      return null;
  }
}

// Same nodes as RenderNode but with no <p> bottom margin so list-item
// text doesn't get a 20px gap between bullets.
function ListItemChild({ node }: { node: TipTapNode }): ReactNode {
  if (node.type === "paragraph") {
    return (
      <span className="text-[1.05rem] leading-[1.65] text-black">
        {node.content?.map((n, i) => <RenderNode key={i} node={n} />)}
      </span>
    );
  }
  return <RenderNode node={node} />;
}

// Inside a callout, paragraphs are centered + no bottom margin so the
// inner text sits visually balanced inside the colored box.
function CalloutChild({ node }: { node: TipTapNode }): ReactNode {
  if (node.type === "paragraph") {
    return (
      <p>{node.content?.map((n, i) => <RenderNode key={i} node={n} />)}</p>
    );
  }
  return <RenderNode node={node} />;
}

function renderText(text: string, marks?: TipTapMark[]): ReactNode {
  if (!marks || marks.length === 0) return text;
  let node: ReactNode = text;
  for (const mark of marks) {
    if (mark.type === "bold") node = <strong>{node}</strong>;
    else if (mark.type === "italic") node = <em>{node}</em>;
    else if (mark.type === "link") {
      const href = (mark.attrs?.href as string | undefined) ?? "#";
      node = (
        <a href={href} className="text-[#0066FF] underline" target="_blank" rel="noopener noreferrer">
          {node}
        </a>
      );
    }
  }
  return node;
}
