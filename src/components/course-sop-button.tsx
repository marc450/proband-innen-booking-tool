"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCourseSop, type SopBlock } from "@/lib/course-sops";

interface Props {
  /** course_templates.course_key. Button renders only if an SOP exists. */
  courseKey: string | null | undefined;
  /** Visual size hint. "sm" for the compact mobile header. */
  size?: "sm" | "default";
  className?: string;
}

function SopBlockView({ block }: { block: SopBlock }) {
  if (block.type === "h3") {
    return (
      <h3 className="text-sm font-semibold text-foreground mt-4">
        {block.text}
      </h3>
    );
  }
  if (block.type === "list") {
    return (
      <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
        {block.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }
  return (
    <p className="text-sm text-muted-foreground leading-relaxed">{block.text}</p>
  );
}

// Button that opens the course SOP (Standardarbeitsanweisung) in a
// scrollable modal. Shared by the desktop course-detail page and the
// mobile Dozent:innen session view. Renders nothing when the course has
// no registered SOP, so it's safe to drop onto every session header.
export function CourseSopButton({ courseKey, size = "default", className }: Props) {
  const [open, setOpen] = useState(false);
  const sop = getCourseSop(courseKey);
  if (!sop) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size === "sm" ? "sm" : "default"}
        onClick={() => setOpen(true)}
        className={className}
      >
        <FileText className={size === "sm" ? "h-4 w-4 mr-1" : "h-4 w-4 mr-2"} />
        Ablauf & SOP
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="wide" className="max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{sop.title}</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Standardarbeitsanweisung · Version {sop.version} · Gültig ab{" "}
              {sop.validFrom}
            </p>
          </DialogHeader>

          <div className="overflow-y-auto pr-1 -mr-1 max-h-[calc(85vh-8rem)] space-y-6">
            {sop.sections.map((section) => (
              <section key={section.heading} className="space-y-2">
                <h2 className="text-base font-bold text-foreground">
                  {section.heading}
                </h2>
                {section.blocks.map((block, i) => (
                  <SopBlockView key={i} block={block} />
                ))}
              </section>
            ))}

            <div className="pt-4 mt-2 border-t text-xs text-muted-foreground space-y-0.5">
              <p>Erstellungsdatum: {sop.createdOn}</p>
              <p>Erstellerin: {sop.author}</p>
              <p>Prüfer: {sop.reviewer}</p>
              <p>Datum Inkrafttreten: {sop.effectiveDate}</p>
              <p className="pt-1 italic">{sop.footerNote}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
