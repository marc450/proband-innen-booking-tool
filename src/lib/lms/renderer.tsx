// TipTap JSON → JSX. Server component. No editor runtime in the
// reader bundle. Extend the switch when adding node types.
import type { ReactNode } from "react";
import { Lightbulb, BookOpen, ArrowRight } from "lucide-react";
import type { TipTapNode, TipTapDoc, TipTapMark } from "./types";
import { CfStreamPlayer } from "@/components/lms/cf-stream-player";
import { FigureImage } from "@/components/lms/figure-image";
import { QuizBlock } from "@/components/lms/quiz-block";

export function LessonBody({ doc }: { doc: TipTapDoc }) {
  return (
    <div className="lms-prose">
      {doc.content?.map((n, i) => {
        // summaryBand is full-bleed: it provides its own internal
        // max-width container, no outer wrapper.
        if (n.type === "summaryBand") {
          return <RenderNode key={i} node={n} />;
        }
        // Default: each top-level block is constrained to max-w-3xl
        // with horizontal padding, so block-level elements (paragraph,
        // heading, list, callout) align consistently while still
        // allowing full-bleed sections to break out.
        return (
          <div key={i} className="max-w-3xl mx-auto px-6">
            <RenderNode node={n} />
          </div>
        );
      })}
    </div>
  );
}

function RenderNode({ node }: { node: TipTapNode }): ReactNode {
  switch (node.type) {
    case "paragraph":
      return (
        <p className="text-[1.05rem] leading-[1.65] text-black mb-5 text-justify hyphens-auto">
          {node.content?.map((n, i) => <RenderNode key={i} node={n} />)}
        </p>
      );

    case "heading": {
      const level = node.attrs.level;
      const colorClass =
        node.attrs.variant === "brown1" ? "text-[#733D29]" : "text-black";
      const sizeClasses =
        level === 1
          ? "text-3xl font-bold mt-10 mb-5 leading-tight"
          : level === 2
          ? "text-2xl font-bold mt-9 mb-4 leading-snug"
          : "text-lg font-bold mt-7 mb-3";
      const Tag = (`h${level}` as "h1" | "h2" | "h3");
      return (
        <Tag className={`${sizeClasses} ${colorClass}`}>
          {node.content?.map((n, i) => <RenderNode key={i} node={n} />)}
        </Tag>
      );
    }

    case "bulletList": {
      // Book variant: small open-book icon left of each item; items
      // can contain multiple paragraphs (Journal Club paper summaries).
      // Each paragraph dispatches through RenderNode so the standard
      // paragraph styles (mb-5, justify) apply per-paragraph.
      if (node.attrs?.variant === "book") {
        return (
          <ul className="list-none pl-0 my-5 space-y-7">
            {node.content?.map((item, i) => {
              if (item.type !== "listItem") return null;
              return (
                <li key={i} className="flex items-start gap-4">
                  <span
                    aria-hidden
                    className="flex-shrink-0 mt-1 text-black"
                  >
                    <BookOpen className="w-5 h-5" strokeWidth={2.25} />
                  </span>
                  <div className="flex-1 min-w-0">
                    {item.content?.map((c, j) => (
                      <RenderNode key={j} node={c} />
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        );
      }
      // Checkmark variant renders each list item with a black filled
      // circle + white check icon (the "Lernziele" pattern in LW).
      // Items are inlined here rather than dispatching to listItem so
      // we don't need parent context.
      if (node.attrs?.variant === "check") {
        return (
          <ul className="list-none pl-0 my-5 space-y-3">
            {node.content?.map((item, i) => {
              if (item.type !== "listItem") return null;
              const flat = item.content?.flatMap((c) =>
                c.type === "paragraph" ? c.content ?? [] : [c],
              );
              return (
                <li
                  key={i}
                  className="flex items-start gap-3 text-[1.05rem] leading-[1.65] text-black"
                >
                  <span
                    aria-hidden
                    className="flex-shrink-0 mt-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-black text-white text-[11px] leading-none"
                  >
                    ✓
                  </span>
                  <span className="flex-1 font-bold">
                    {flat?.map((c, j) => (
                      <RenderNode key={j} node={c} />
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        );
      }
      return (
        <ul className="list-disc pl-6 my-5 space-y-2 text-[1.05rem] leading-[1.65] text-black marker:text-[#0066FF]">
          {node.content?.map((n, i) => <RenderNode key={i} node={n} />)}
        </ul>
      );
    }

    case "orderedList": {
      // Citations variant: smaller text, denser line height, paragraph
      // wrappers stripped so each citation reads as one continuous
      // sentence. Used for Literaturverzeichnis sections.
      if (node.attrs?.variant === "citations") {
        return (
          <ol className="list-decimal pl-6 my-5 space-y-3 text-sm leading-[1.55] text-black/70">
            {node.content?.map((item, i) => {
              if (item.type !== "listItem") return null;
              const flat = item.content?.flatMap((c) =>
                c.type === "paragraph" ? c.content ?? [] : [c],
              );
              return (
                <li key={i} className="break-words">
                  {flat?.map((c, j) => (
                    <RenderNode key={j} node={c} />
                  ))}
                </li>
              );
            })}
          </ol>
        );
      }
      return (
        <ol className="list-decimal pl-6 my-5 space-y-2 text-[1.05rem] leading-[1.65] text-black">
          {node.content?.map((n, i) => <RenderNode key={i} node={n} />)}
        </ol>
      );
    }

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
      // Think variant: blue background with a lightbulb icon prefix —
      // used for key insights embedded in the prose.
      if (variant === "think") {
        return (
          <div className="bg-[#0066FF] text-white rounded-[10px] px-6 py-5 my-6 font-bold leading-[1.65] flex items-start gap-4">
            <span aria-hidden className="flex-shrink-0 mt-1">
              <Lightbulb className="w-6 h-6" strokeWidth={2.25} />
            </span>
            <div className="flex-1">
              {node.content?.map((n, i) => (
                <CalloutChild key={i} node={n} />
              ))}
            </div>
          </div>
        );
      }
      const classes =
        variant === "signal"
          ? "bg-[#0066FF] text-white"
          : variant === "rose"
          ? "bg-[#FAEBE1] text-[#733D29]"
          : "bg-[#733D29] text-[#FAEBE1]";
      return (
        <div className={`${classes} rounded-[10px] px-6 py-5 my-6 font-bold leading-[1.65]`}>
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

    case "figure":
      return (
        <figure className="my-8">
          <FigureImage src={node.attrs.src} alt={node.attrs.alt} />
          {(node.attrs.label || node.attrs.caption) ? (
            <figcaption className="mt-3 text-sm text-black/70 text-center">
              {node.attrs.label ? (
                <span className="font-semibold">{node.attrs.label}</span>
              ) : null}
              {node.attrs.label && node.attrs.caption ? ": " : ""}
              {node.attrs.caption}
            </figcaption>
          ) : null}
        </figure>
      );

    case "ctaButton": {
      const isExternal = /^https?:\/\//.test(node.attrs.href);
      return (
        <div className="my-10 text-center">
          <a
            href={node.attrs.href}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            className="inline-flex items-center gap-2 bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-base md:text-lg px-7 py-4 rounded-[10px] transition-colors"
          >
            <span>{node.attrs.label}</span>
            <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
          </a>
        </div>
      );
    }

    case "quiz":
      return (
        <QuizBlock
          questions={node.attrs.questions}
          passCouponCode={node.attrs.passCouponCode}
          voucherLabel={node.attrs.voucherLabel}
          grundkursUrl={node.attrs.grundkursUrl}
          timePerQuestionSeconds={node.attrs.timePerQuestionSeconds}
        />
      );

    case "motivationBlock":
      return (
        <div className="my-12 py-10 text-center">
          <div className="relative inline-block">
            <span
              aria-hidden
              className="absolute -top-6 -left-10 text-2xl animate-pulse pointer-events-none"
              style={{ animationDelay: "0.2s" }}
            >
              ✨
            </span>
            <span
              aria-hidden
              className="absolute -top-4 -right-12 text-xl animate-pulse pointer-events-none"
              style={{ animationDelay: "0.5s" }}
            >
              ✨
            </span>
            <span
              aria-hidden
              className="absolute -bottom-2 -left-8 text-lg animate-pulse pointer-events-none"
              style={{ animationDelay: "0.8s" }}
            >
              ⭐
            </span>
            <span
              aria-hidden
              className="absolute -bottom-3 -right-9 text-2xl animate-pulse pointer-events-none"
              style={{ animationDelay: "0.3s" }}
            >
              ✨
            </span>
            <div className="text-7xl animate-bounce">😊</div>
          </div>
          <p className="mt-8 text-xl font-bold text-black max-w-md mx-auto px-6">
            {node.attrs.message}
          </p>
        </div>
      );

    case "summaryBand": {
      const headerChildren =
        node.content?.filter(
          (c) => c.type === "heading" || c.type === "paragraph",
        ) ?? [];
      const cardChildren =
        node.content?.filter((c) => c.type === "summaryCard") ?? [];
      return (
        <section className="bg-[#0066FF] py-14 my-10">
          <div className="max-w-3xl mx-auto px-6">
            {headerChildren.map((c, i) => {
              if (c.type === "heading") {
                return (
                  <h3
                    key={i}
                    className="text-xl font-bold text-white leading-snug mb-3"
                  >
                    {c.content?.map((cc, j) => (
                      <RenderNode key={j} node={cc} />
                    ))}
                  </h3>
                );
              }
              return (
                <p
                  key={i}
                  className="text-base font-bold text-white leading-snug mb-10"
                >
                  {c.content?.map((cc, j) => (
                    <RenderNode key={j} node={cc} />
                  ))}
                </p>
              );
            })}
            <div className="space-y-4">
              {cardChildren.map((c, i) => (
                <RenderNode key={i} node={c} />
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "summaryCard": {
      // Cards are rendered without paragraph wrappers around their
      // text so we don't carry the standard paragraph bottom margin
      // into a single-line card.
      const flat = node.content?.flatMap((c) =>
        c.type === "paragraph" ? c.content ?? [] : [c],
      );
      return (
        <div className="bg-white rounded-[10px] px-6 py-4 flex items-start gap-3 shadow-sm">
          <span
            aria-hidden
            className="flex-shrink-0 mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-black text-white text-[11px] leading-none"
          >
            ✓
          </span>
          <div className="flex-1 text-black leading-snug">
            {flat?.map((c, i) => (
              <RenderNode key={i} node={c} />
            ))}
          </div>
        </div>
      );
    }

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

// Inside a callout, paragraphs get a small bottom margin so multi-
// paragraph callouts (e.g. "Frage Dich selbst:" + the question) read
// as distinct lines without merging into a wall of text. Last child
// has no margin so the box doesn't get visually heavy at the bottom.
//
// A paragraph with attrs.weight = "normal" opts out of the callout's
// bold default — used for "Frage Dich selbst:" prompts where the
// header stays bold and the question below renders in normal weight.
function CalloutChild({ node }: { node: TipTapNode }): ReactNode {
  if (node.type === "paragraph") {
    const weight = node.attrs?.weight;
    return (
      <p
        className={
          "mb-3 last:mb-0" + (weight === "normal" ? " font-normal" : "")
        }
      >
        {node.content?.map((n, i) => <RenderNode key={i} node={n} />)}
      </p>
    );
  }
  return <RenderNode node={node} />;
}

function renderText(text: string, marks?: TipTapMark[]): ReactNode {
  // Inline scholarly citations in the form (1) / (2, 3) / (8, 9) get
  // rendered as superscript without parens — matches academic
  // typographic convention and brings the body text in line with what
  // editors expect. The pattern is purely numeric inside the parens
  // so things like (BoNT-A), (MCS), (Abb. 2), (z. B.) are unaffected.
  const citationRe = /\((\d+(?:\s*,\s*\d+)*)\)/g;
  let node: ReactNode = text;
  if (citationRe.test(text)) {
    const parts: ReactNode[] = [];
    let lastIdx = 0;
    citationRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = citationRe.exec(text)) !== null) {
      if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index));
      parts.push(
        <sup key={`c-${m.index}`} className="text-[0.7em] ml-0.5">
          {m[1]}
        </sup>,
      );
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < text.length) parts.push(text.slice(lastIdx));
    node = <>{parts}</>;
  }

  if (!marks || marks.length === 0) return node;
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
