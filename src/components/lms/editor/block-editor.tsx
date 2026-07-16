"use client";

// Visual block editor for an LMS lesson body. Edits the lesson as a list
// of typed blocks (no JSON), each with a human-friendly form. Emits the
// exact TipTap node array the reader's renderer consumes.
import { useState, useRef, useEffect } from "react";
import type { TipTapNode } from "@/lib/lms/types";
import { RichTextField, type RtNode } from "./rich-text";
import { ImageDropzone } from "./image-dropzone";
import { VideoDropzone } from "./video-dropzone";
import {
  DEFAULT_SUCCESS_TITLE, DEFAULT_SUCCESS_BODY,
  DEFAULT_FAIL_TITLE, DEFAULT_FAIL_BODY, DEFAULT_CTA_LABEL,
} from "@/components/lms/quiz-block";
import {
  Plus, Trash2, ArrowUp, ArrowDown, Type, Heading as HeadingIcon,
  MessageSquare, List, ListOrdered, Image as ImageIcon, Images, Video,
  MousePointerClick, Smile, LayoutGrid, HelpCircle, ChevronDown, Library,
  Table as TableIcon,
} from "lucide-react";

type Block = RtNode;

// ── Block catalog (insert menu) ──────────────────────────────────────
const CATALOG: { type: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: "heading", label: "Überschrift", icon: HeadingIcon },
  { type: "paragraph", label: "Textabsatz", icon: Type },
  { type: "callout", label: "Hervorhebung (Callout)", icon: MessageSquare },
  { type: "bulletList", label: "Aufzählung", icon: List },
  { type: "orderedList", label: "Nummerierte Liste", icon: ListOrdered },
  { type: "figure", label: "Bild", icon: ImageIcon },
  { type: "figureRow", label: "Zwei Bilder nebeneinander", icon: Images },
  { type: "video", label: "Video", icon: Video },
  { type: "ctaButton", label: "Button (CTA)", icon: MousePointerClick },
  { type: "motivationBlock", label: "Motivation", icon: Smile },
  { type: "summaryBand", label: "Zusammenfassung", icon: LayoutGrid },
  { type: "quiz", label: "Quiz", icon: HelpCircle },
  { type: "bibliography", label: "Literaturverzeichnis", icon: Library },
  { type: "table", label: "Tabelle", icon: TableIcon },
];

function makeBlock(type: string): Block {
  switch (type) {
    case "heading": return { type: "heading", attrs: { level: 2, variant: "default" }, content: [] };
    case "paragraph": return { type: "paragraph", content: [] };
    case "callout": return { type: "callout", attrs: { variant: "signal" }, content: [{ type: "paragraph", content: [] }] };
    case "bulletList": return { type: "bulletList", attrs: { variant: "default" }, content: [listItem()] };
    case "orderedList": return { type: "orderedList", attrs: { variant: "default" }, content: [listItem()] };
    case "figure": return emptyFigure();
    case "figureRow": return { type: "figureRow", content: [emptyFigure(), emptyFigure()] };
    case "video": return { type: "video", attrs: { cfStreamVideoId: null } };
    case "ctaButton": return { type: "ctaButton", attrs: { label: "Jetzt buchen", href: "" } };
    case "motivationBlock": return { type: "motivationBlock", attrs: { message: "" } };
    case "summaryBand": return { type: "summaryBand", attrs: { variant: "signal" }, content: [{ type: "summaryCard", content: [{ type: "paragraph", content: [] }] }] };
    case "quiz": return { type: "quiz", attrs: { questions: [newQuestion()] } };
    case "bibliography": return { type: "bibliography", attrs: { title: "Literaturverzeichnis" }, content: [listItem()] };
    case "table": return { type: "table", attrs: { withHeader: true }, content: [tableRow(2), tableRow(2)] };
    default: return { type: "paragraph", content: [] };
  }
}

const emptyFigure = (): Block => ({ type: "figure", attrs: { src: "", alt: "", label: "", caption: "" } });
const listItem = (): Block => ({ type: "listItem", content: [{ type: "paragraph", content: [] }] });
const tableCell = (): Block => ({ type: "tableCell", content: [{ type: "paragraph", content: [] }] });
const tableRow = (cols: number): Block => ({ type: "tableRow", content: Array.from({ length: cols }, tableCell) });
const newQuestion = () => ({ question: "", options: [{ text: "", correct: true }, { text: "", correct: false }] });

const labelFor = (type: string) => CATALOG.find((c) => c.type === type)?.label ?? type;

// ── Main editor ──────────────────────────────────────────────────────
export function BlockEditor({
  value,
  onChange,
}: {
  value: TipTapNode[];
  onChange: (blocks: TipTapNode[]) => void;
}) {
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  const blocks = value as unknown as Block[];
  // The renderer's strict union is enforced at save time by the
  // validator; internally we emit the loose node shape.
  const emit = (b: Block[]) => onChange(b as unknown as TipTapNode[]);

  const setBlock = (i: number, next: Block) => {
    const copy = [...blocks];
    copy[i] = next;
    emit(copy);
  };
  const insertAt = (i: number, type: string) => {
    const copy = [...blocks];
    copy.splice(i, 0, makeBlock(type));
    emit(copy);
    setMenuOpen(null);
  };
  const remove = (i: number) => emit(blocks.filter((_, j) => j !== i));
  const move = (i: number, dir: -1 | 1) => {
    const t = i + dir;
    if (t < 0 || t >= blocks.length) return;
    const copy = [...blocks];
    [copy[i], copy[t]] = [copy[t], copy[i]];
    emit(copy);
  };

  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Noch kein Inhalt. Füge unten den ersten Block hinzu.
        </p>
      )}

      {blocks.map((block, i) => (
        <div key={i}>
          <InsertBar open={menuOpen === i} onToggle={() => setMenuOpen(menuOpen === i ? null : i)} onPick={(t) => insertAt(i, t)} />
          <div className="rounded-[10px] border bg-white">
            <div className="flex items-center justify-between px-3 py-1.5 border-b bg-gray-50/60 rounded-t-[10px]">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {labelFor(block.type)}
              </span>
              <div className="flex items-center gap-0.5">
                <Mini title="Nach oben" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="h-3.5 w-3.5" /></Mini>
                <Mini title="Nach unten" onClick={() => move(i, 1)} disabled={i === blocks.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Mini>
                <Mini title="Block löschen" onClick={() => remove(i)} danger><Trash2 className="h-3.5 w-3.5" /></Mini>
              </div>
            </div>
            <div className="p-3">
              <BlockBody block={block} onChange={(b) => setBlock(i, b)} />
            </div>
          </div>
        </div>
      ))}

      <InsertBar open={menuOpen === blocks.length} onToggle={() => setMenuOpen(menuOpen === blocks.length ? null : blocks.length)} onPick={(t) => insertAt(blocks.length, t)} last />
    </div>
  );
}

function InsertBar({ open, onToggle, onPick, last }: { open: boolean; onToggle: () => void; onPick: (type: string) => void; last?: boolean }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  // Flip the menu up and cap its height so it always fits the viewport,
  // wherever in the (possibly long) lesson the insert bar sits.
  const [placement, setPlacement] = useState<{ up: boolean; maxH: number }>({ up: false, maxH: 360 });

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const measure = () => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const margin = 16;
      const below = window.innerHeight - rect.bottom - margin;
      const above = rect.top - margin;
      const up = below < 280 && above > below;
      setPlacement({ up, maxH: Math.max(180, Math.floor(up ? above : below)) });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);

  return (
    <div className={`relative ${last ? "" : "-mb-1.5 mt-1.5"}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-1.5 mx-auto text-xs px-3 py-1.5 rounded-full border transition-colors ${
          open ? "bg-[#0066FF] text-white border-[#0066FF]" : "text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-white"
        }`}
      >
        <Plus className="h-3.5 w-3.5" /> Block hinzufügen <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div
          className={`absolute z-30 left-1/2 -translate-x-1/2 bg-white border rounded-[10px] shadow-lg py-1 w-64 overflow-y-auto overscroll-contain ${
            placement.up ? "bottom-full mb-1" : "top-full mt-1"
          }`}
          style={{ maxHeight: placement.maxH }}
        >
          {CATALOG.map((c) => {
            const Icon = c.icon;
            return (
              <button key={c.type} type="button" onClick={() => onPick(c.type)}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left hover:bg-gray-50">
                <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" /> {c.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Per-type body ────────────────────────────────────────────────────
function BlockBody({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const attrs = (block.attrs ?? {}) as Record<string, unknown>;
  const setAttrs = (patch: Record<string, unknown>) => onChange({ ...block, attrs: { ...attrs, ...patch } });
  const content = (block.content ?? []) as Block[];
  const setContent = (c: Block[]) => onChange({ ...block, content: c });

  switch (block.type) {
    case "heading":
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Select value={String(attrs.level ?? 2)} onChange={(v) => setAttrs({ level: Number(v) })}
              options={[["1", "H1 (groß)"], ["2", "H2 (mittel)"], ["3", "H3 (klein)"]]} />
            <Select value={String(attrs.variant ?? "default")} onChange={(v) => setAttrs({ variant: v })}
              options={[["default", "Schwarz"], ["brown1", "Braun"]]} />
          </div>
          <RichTextField mode="inline" value={content} onChange={setContent} placeholder="Überschrift" />
        </div>
      );

    case "paragraph":
      return <RichTextField mode="inline" value={content} onChange={setContent} placeholder="Text schreiben…" />;

    case "callout":
      return (
        <div className="space-y-2">
          <Select value={String(attrs.variant ?? "signal")} onChange={(v) => setAttrs({ variant: v })}
            options={[["signal", "Blau (Signal)"], ["rose", "Rosé"], ["brown1", "Braun"], ["think", "Blau + Glühbirne (Insight)"]]} />
          <RichTextField mode="multiline" value={content} onChange={setContent} placeholder="Hervorgehobener Text…" emphasized />
          <p className="text-[11px] text-muted-foreground">Callout-Text wird immer fett dargestellt.</p>
        </div>
      );

    case "bulletList":
    case "orderedList":
      return (
        <ListEditor
          block={block}
          ordered={block.type === "orderedList"}
          setAttrs={setAttrs}
          setContent={setContent}
        />
      );

    case "figure":
      return <FigureEditor attrs={attrs} setAttrs={setAttrs} />;

    case "figureRow":
      return <FigureRowEditor content={content} setContent={setContent} />;

    case "video":
      return <VideoEditor attrs={attrs} setAttrs={setAttrs} />;

    case "ctaButton":
      return (
        <div className="flex gap-2">
          <TextInput label="Button-Text" value={String(attrs.label ?? "")} onChange={(v) => setAttrs({ label: v })} placeholder="Jetzt buchen" />
          <TextInput label="Link (URL)" value={String(attrs.href ?? "")} onChange={(v) => setAttrs({ href: v })} placeholder="https://… oder /pfad" />
        </div>
      );

    case "motivationBlock":
      return <TextInput label="Nachricht" value={String(attrs.message ?? "")} onChange={(v) => setAttrs({ message: v })} placeholder="Weiter so, Du schaffst das!" />;

    case "summaryBand":
      return <SummaryBandEditor content={content} setContent={setContent} />;

    case "quiz":
      return <QuizEditor attrs={attrs} setAttrs={setAttrs} />;

    case "bibliography":
      return <BibliographyEditor attrs={attrs} setAttrs={setAttrs} content={content} setContent={setContent} />;

    case "table":
      return <TableEditor attrs={attrs} setAttrs={setAttrs} content={content} setContent={setContent} />;

    default:
      return <p className="text-xs text-muted-foreground">Dieser Blocktyp kann hier nicht bearbeitet werden.</p>;
  }
}

// ── Figure editor ────────────────────────────────────────────────────
function FigureEditor({ attrs, setAttrs }: { attrs: Record<string, unknown>; setAttrs: (p: Record<string, unknown>) => void }) {
  const [showUrl, setShowUrl] = useState(false);
  return (
    <div className="space-y-2.5">
      <ImageDropzone value={String(attrs.src ?? "")} onChange={(url) => setAttrs({ src: url })} />
      {!showUrl ? (
        <button type="button" onClick={() => setShowUrl(true)} className="text-[11px] text-muted-foreground hover:text-foreground">
          oder Bild-URL manuell eingeben
        </button>
      ) : (
        <TextInput label="Bild-URL" value={String(attrs.src ?? "")} onChange={(v) => setAttrs({ src: v })} placeholder="https://…/bild.jpg" />
      )}
      <TextInput label="Alt-Text (Barrierefreiheit)" value={String(attrs.alt ?? "")} onChange={(v) => setAttrs({ alt: v })} placeholder="Bildbeschreibung" />
      <div className="flex gap-2">
        <TextInput label="Label" value={String(attrs.label ?? "")} onChange={(v) => setAttrs({ label: v })} placeholder="z. B. Abb. 1" />
        <TextInput label="Bildunterschrift" value={String(attrs.caption ?? "")} onChange={(v) => setAttrs({ caption: v })} placeholder="optional" />
      </div>
    </div>
  );
}

// ── Video editor ─────────────────────────────────────────────────────
function VideoEditor({ attrs, setAttrs }: { attrs: Record<string, unknown>; setAttrs: (p: Record<string, unknown>) => void }) {
  const [showId, setShowId] = useState(false);
  const vid = String(attrs.cfStreamVideoId ?? "");
  return (
    <div className="space-y-2.5">
      <VideoDropzone value={vid} onChange={(uid) => setAttrs({ cfStreamVideoId: uid || null })} />
      {!showId ? (
        <button type="button" onClick={() => setShowId(true)} className="text-[11px] text-muted-foreground hover:text-foreground">
          oder Cloudflare Video-ID manuell eingeben
        </button>
      ) : (
        <TextInput
          label="Cloudflare Stream Video-ID"
          value={vid}
          onChange={(v) => setAttrs({ cfStreamVideoId: v.trim() || null })}
          placeholder="z. B. a1b2c3d4…"
        />
      )}
    </div>
  );
}

// ── Figure row editor (images side by side) ──────────────────────────
function FigureRowEditor({ content, setContent }: { content: Block[]; setContent: (c: Block[]) => void }) {
  const figures = content.filter((n) => n.type === "figure") as Block[];
  const setFig = (idx: number, patch: Record<string, unknown>) =>
    setContent(figures.map((f, j) => (j === idx ? { ...f, attrs: { ...(f.attrs ?? {}), ...patch } } : f)));
  const addCol = () => setContent([...figures, emptyFigure()]);
  const removeCol = (idx: number) => setContent(figures.filter((_, j) => j !== idx));

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {figures.map((f, idx) => (
          <div key={idx} className="rounded-md border p-2.5 space-y-2 bg-gray-50/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">Bild {idx + 1}</span>
              <Mini title="Bild entfernen" onClick={() => removeCol(idx)} danger disabled={figures.length <= 1}>
                <Trash2 className="h-3.5 w-3.5" />
              </Mini>
            </div>
            <FigureEditor attrs={(f.attrs ?? {}) as Record<string, unknown>} setAttrs={(p) => setFig(idx, p)} />
          </div>
        ))}
      </div>
      {figures.length < 3 && (
        <button type="button" onClick={addCol} className="text-xs text-[#0066FF] hover:underline flex items-center gap-1">
          <Plus className="h-3 w-3" /> Spalte hinzufügen
        </button>
      )}
      <p className="text-[11px] text-muted-foreground">Bilder stehen nebeneinander, auf dem Smartphone untereinander.</p>
    </div>
  );
}

// ── List editor ──────────────────────────────────────────────────────
function ListEditor({
  block, ordered, setAttrs, setContent,
}: {
  block: Block; ordered: boolean;
  setAttrs: (p: Record<string, unknown>) => void; setContent: (c: Block[]) => void;
}) {
  const attrs = (block.attrs ?? {}) as Record<string, unknown>;
  const items = (block.content ?? []) as Block[];
  const itemInline = (it: Block): Block[] => {
    const p = (it.content as Block[] | undefined)?.[0];
    return ((p?.content as Block[]) ?? []);
  };
  const setItemInline = (idx: number, inline: Block[]) => {
    const copy = items.map((it) => ({ ...it }));
    copy[idx] = { type: "listItem", content: [{ type: "paragraph", content: inline }] };
    setContent(copy);
  };
  const addItem = () => setContent([...items, listItem()]);
  const removeItem = (idx: number) => setContent(items.filter((_, j) => j !== idx));

  const variantOptions: [string, string][] = ordered
    ? [["default", "Standard"], ["citations", "Quellen (klein, dezent)"]]
    : [["default", "Punkte"], ["check", "Häkchen (Lernziele)"], ["book", "Buch-Icon (Journal Club)"]];

  return (
    <div className="space-y-2">
      <Select value={String(attrs.variant ?? "default")} onChange={(v) => setAttrs({ variant: v })} options={variantOptions} />
      <div className="space-y-1.5">
        {items.map((it, idx) => (
          <div key={idx} className="flex items-start gap-1.5">
            <span className="mt-2 text-xs text-muted-foreground w-4 text-right">{ordered ? `${idx + 1}.` : "•"}</span>
            <div className="flex-1">
              <RichTextField mode="inline" value={itemInline(it)} onChange={(inline) => setItemInline(idx, inline)} placeholder="Listenpunkt" />
            </div>
            <Mini title="Punkt entfernen" onClick={() => removeItem(idx)} danger><Trash2 className="h-3.5 w-3.5" /></Mini>
          </div>
        ))}
      </div>
      <button type="button" onClick={addItem} className="text-xs text-[#0066FF] hover:underline flex items-center gap-1">
        <Plus className="h-3 w-3" /> Punkt hinzufügen
      </button>
    </div>
  );
}

// ── Bibliography editor (Literaturverzeichnis) ───────────────────────
function BibliographyEditor({
  attrs, setAttrs, content, setContent,
}: {
  attrs: Record<string, unknown>;
  setAttrs: (p: Record<string, unknown>) => void;
  content: Block[];
  setContent: (c: Block[]) => void;
}) {
  const items = content.filter((n) => n.type === "listItem") as Block[];
  const itemInline = (it: Block): Block[] =>
    (((it.content as Block[] | undefined)?.[0]?.content as Block[]) ?? []);
  const setItemInline = (idx: number, inline: Block[]) => {
    const copy = items.map((it) => ({ ...it }));
    copy[idx] = { type: "listItem", content: [{ type: "paragraph", content: inline }] };
    setContent(copy);
  };
  const addItem = () => setContent([...items, listItem()]);
  const removeItem = (idx: number) => setContent(items.filter((_, j) => j !== idx));

  return (
    <div className="space-y-2">
      <TextInput
        label="Überschrift"
        value={String(attrs.title ?? "Literaturverzeichnis")}
        onChange={(v) => setAttrs({ title: v })}
        placeholder="Literaturverzeichnis"
      />
      <div className="space-y-1.5 pt-1">
        {items.map((it, idx) => (
          <div key={idx} className="flex items-start gap-1.5">
            <span className="mt-2 text-xs text-muted-foreground w-5 text-right">{idx + 1}.</span>
            <div className="flex-1">
              <RichTextField
                mode="inline"
                value={itemInline(it)}
                onChange={(inline) => setItemInline(idx, inline)}
                placeholder="Autor:in, A. (Jahr). Titel. Journal, Band(Heft), Seiten. https://doi.org/…"
              />
            </div>
            <Mini title="Quelle entfernen" onClick={() => removeItem(idx)} danger><Trash2 className="h-3.5 w-3.5" /></Mini>
          </div>
        ))}
      </div>
      <button type="button" onClick={addItem} className="text-xs text-[#0066FF] hover:underline flex items-center gap-1">
        <Plus className="h-3 w-3" /> Quelle hinzufügen
      </button>
      <p className="text-[11px] text-muted-foreground">DOI- und URL-Links werden für Lernende automatisch klickbar.</p>
    </div>
  );
}

// ── Table editor ─────────────────────────────────────────────────────
function TableEditor({
  attrs, setAttrs, content, setContent,
}: {
  attrs: Record<string, unknown>;
  setAttrs: (p: Record<string, unknown>) => void;
  content: Block[];
  setContent: (c: Block[]) => void;
}) {
  const rows = content.filter((n) => n.type === "tableRow") as Block[];
  const colCount = Math.max(1, ...rows.map((r) => ((r.content as Block[] | undefined)?.length ?? 0)));
  const withHeader = Boolean(attrs.withHeader);

  const cellOf = (r: Block, ci: number): Block =>
    (((r.content as Block[] | undefined)?.[ci]) ?? tableCell());
  const cellContent = (cell: Block): Block[] => ((cell.content as Block[] | undefined) ?? []);

  const setCellContent = (ri: number, ci: number, c: Block[]) => {
    setContent(
      rows.map((r, rI) => {
        if (rI !== ri) return r;
        // Pad short rows up to colCount so every cell index is editable.
        const cells: Block[] = Array.from({ length: colCount }, (_, k) => cellOf(r, k));
        cells[ci] = { type: "tableCell", content: c };
        return { ...r, content: cells };
      }),
    );
  };

  const addRow = () => setContent([...rows, tableRow(colCount)]);
  const removeRow = (ri: number) => setContent(rows.filter((_, i) => i !== ri));
  const addCol = () =>
    setContent(rows.map((r) => ({
      ...r,
      content: [...Array.from({ length: colCount }, (_, k) => cellOf(r, k)), tableCell()],
    })));
  const removeCol = (ci: number) =>
    setContent(rows.map((r) => ({
      ...r,
      content: Array.from({ length: colCount }, (_, k) => cellOf(r, k)).filter((_, k) => k !== ci),
    })));

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={withHeader} onChange={(e) => setAttrs({ withHeader: e.target.checked })} />
        Erste Zeile als Kopfzeile
      </label>
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1">
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                <td className="align-top pt-2 pr-1">
                  <Mini title="Zeile entfernen" onClick={() => removeRow(ri)} danger disabled={rows.length <= 1}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Mini>
                </td>
                {Array.from({ length: colCount }).map((_, ci) => (
                  <td key={ci} className="align-top min-w-[200px]">
                    <RichTextField
                      mode="multiline"
                      value={cellContent(cellOf(r, ci))}
                      onChange={(c) => setCellContent(ri, ci, c)}
                      placeholder={withHeader && ri === 0 ? "Spaltentitel" : "Zelleninhalt"}
                      emphasized={withHeader && ri === 0}
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td />
              {Array.from({ length: colCount }).map((_, ci) => (
                <td key={ci} className="text-center">
                  <Mini title="Spalte entfernen" onClick={() => removeCol(ci)} danger disabled={colCount <= 1}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Mini>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={addRow} className="text-xs text-[#0066FF] hover:underline flex items-center gap-1">
          <Plus className="h-3 w-3" /> Zeile hinzufügen
        </button>
        <button type="button" onClick={addCol} className="text-xs text-[#0066FF] hover:underline flex items-center gap-1">
          <Plus className="h-3 w-3" /> Spalte hinzufügen
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">In einer Zelle erzeugt Enter eine neue Zeile. Fett/Kursiv/Link über die Zellen-Leiste.</p>
    </div>
  );
}

// ── Summary band editor ──────────────────────────────────────────────
function SummaryBandEditor({ content, setContent }: { content: Block[]; setContent: (c: Block[]) => void }) {
  const heading = content.find((n) => n.type === "heading") as Block | undefined;
  const intro = content.find((n) => n.type === "paragraph") as Block | undefined;
  const cards = content.filter((n) => n.type === "summaryCard") as Block[];

  const rebuild = (h: Block[], p: Block[], cs: Block[]) => {
    const next: Block[] = [];
    if (h.length) next.push({ type: "heading", attrs: { level: 3 }, content: h });
    if (p.length) next.push({ type: "paragraph", content: p });
    next.push(...cs);
    setContent(next);
  };
  const headingInline = (heading?.content as Block[]) ?? [];
  const introInline = (intro?.content as Block[]) ?? [];
  const cardInline = (c: Block): Block[] => ((c.content as Block[])?.[0]?.content as Block[]) ?? [];
  const setCard = (idx: number, inline: Block[]) => {
    const cs = cards.map((c, j) => (j === idx ? { type: "summaryCard", content: [{ type: "paragraph", content: inline }] } as Block : c));
    rebuild(headingInline, introInline, cs);
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">Blauer Abschnitt mit Überschrift und Häkchen-Karten.</p>
      <RichTextField mode="inline" value={headingInline} onChange={(h) => rebuild(h, introInline, cards)} placeholder="Überschrift (optional)" emphasized />
      <RichTextField mode="inline" value={introInline} onChange={(p) => rebuild(headingInline, p, cards)} placeholder="Einleitungstext (optional)" emphasized />
      <div className="space-y-1.5 pt-1">
        {cards.map((c, idx) => (
          <div key={idx} className="flex items-start gap-1.5">
            <span className="mt-2 text-xs text-muted-foreground">✓</span>
            <div className="flex-1">
              <RichTextField mode="inline" value={cardInline(c)} onChange={(inline) => setCard(idx, inline)} placeholder="Kernaussage" />
            </div>
            <Mini title="Karte entfernen" onClick={() => rebuild(headingInline, introInline, cards.filter((_, j) => j !== idx))} danger>
              <Trash2 className="h-3.5 w-3.5" />
            </Mini>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => rebuild(headingInline, introInline, [...cards, { type: "summaryCard", content: [{ type: "paragraph", content: [] }] }])}
        className="text-xs text-[#0066FF] hover:underline flex items-center gap-1">
        <Plus className="h-3 w-3" /> Karte hinzufügen
      </button>
    </div>
  );
}

// ── Quiz editor ──────────────────────────────────────────────────────
function QuizEditor({ attrs, setAttrs }: { attrs: Record<string, unknown>; setAttrs: (p: Record<string, unknown>) => void }) {
  const questions = (attrs.questions as { question: string; options: { text: string; correct: boolean }[] }[]) ?? [];
  const setQuestions = (q: typeof questions) => setAttrs({ questions: q });

  const update = (qi: number, patch: Partial<(typeof questions)[number]>) =>
    setQuestions(questions.map((q, j) => (j === qi ? { ...q, ...patch } : q)));

  return (
    <div className="space-y-3">
      {questions.map((q, qi) => (
        <div key={qi} className="rounded-md border p-2.5 space-y-2 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Frage {qi + 1}</span>
            <Mini title="Frage entfernen" onClick={() => setQuestions(questions.filter((_, j) => j !== qi))} danger><Trash2 className="h-3.5 w-3.5" /></Mini>
          </div>
          <TextInput label="" value={q.question} onChange={(v) => update(qi, { question: v })} placeholder="Fragetext" />
          <div className="space-y-1.5">
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${qi}`}
                  checked={opt.correct}
                  onChange={() => update(qi, { options: q.options.map((o, k) => ({ ...o, correct: k === oi })) })}
                  title="Richtige Antwort"
                />
                <input
                  value={opt.text}
                  onChange={(e) => update(qi, { options: q.options.map((o, k) => (k === oi ? { ...o, text: e.target.value } : o)) })}
                  placeholder={`Antwort ${oi + 1}`}
                  className="flex-1 h-8 text-sm px-2 rounded border border-input"
                />
                <Mini title="Antwort entfernen" onClick={() => update(qi, { options: q.options.filter((_, k) => k !== oi) })} danger disabled={q.options.length <= 2}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Mini>
              </div>
            ))}
            <button type="button" onClick={() => update(qi, { options: [...q.options, { text: "", correct: false }] })}
              className="text-xs text-[#0066FF] hover:underline flex items-center gap-1">
              <Plus className="h-3 w-3" /> Antwort hinzufügen
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => setQuestions([...questions, newQuestion()])}
        className="text-xs text-[#0066FF] hover:underline flex items-center gap-1">
        <Plus className="h-3 w-3" /> Frage hinzufügen
      </button>
      <div className="flex gap-2 pt-1">
        <TextInput label="Gutschein-Label (optional)" value={String(attrs.voucherLabel ?? "")} onChange={(v) => setAttrs({ voucherLabel: v || undefined })} placeholder="z. B. 50 € Gutschein" />
      </div>
      <div className="rounded-md border p-2.5 space-y-2 bg-gray-50/50">
        <span className="text-[11px] font-medium text-muted-foreground">Ergebnis: alle Fragen richtig</span>
        <TextInput label="Titel" value={String(attrs.successTitle ?? "")} onChange={(v) => setAttrs({ successTitle: v || undefined })} placeholder={DEFAULT_SUCCESS_TITLE} />
        <TextArea label="Text" value={String(attrs.successBody ?? "")} onChange={(v) => setAttrs({ successBody: v || undefined })} placeholder={DEFAULT_SUCCESS_BODY} />
      </div>
      <div className="rounded-md border p-2.5 space-y-2 bg-gray-50/50">
        <span className="text-[11px] font-medium text-muted-foreground">Ergebnis: nicht alle richtig</span>
        <TextInput label="Titel" value={String(attrs.failTitle ?? "")} onChange={(v) => setAttrs({ failTitle: v || undefined })} placeholder={DEFAULT_FAIL_TITLE} />
        <TextArea label="Text" value={String(attrs.failBody ?? "")} onChange={(v) => setAttrs({ failBody: v || undefined })} placeholder={DEFAULT_FAIL_BODY} />
      </div>
      <div className="rounded-md border p-2.5 space-y-2 bg-gray-50/50">
        <span className="text-[11px] font-medium text-muted-foreground">Button auf dem Ergebnis-Screen (optional)</span>
        <div className="flex gap-2">
          <TextInput label="Kurs-Link" value={String(attrs.grundkursUrl ?? "")} onChange={(v) => setAttrs({ grundkursUrl: v || undefined })} placeholder="https://ephia.de/..." />
          <TextInput label="Button-Text" value={String(attrs.ctaLabel ?? "")} onChange={(v) => setAttrs({ ctaLabel: v || undefined })} placeholder={DEFAULT_CTA_LABEL} />
        </div>
        <span className="block text-[11px] text-muted-foreground">Der Button erscheint nur, wenn ein Kurs-Link gesetzt ist.</span>
      </div>
      <p className="text-[11px] text-muted-foreground">Der Radio-Button markiert die richtige Antwort. Pro Frage genau eine richtige Antwort. Leere Ergebnis-Felder verwenden den Standardtext.</p>
    </div>
  );
}

// ── Small shared UI ──────────────────────────────────────────────────
function Mini({ children, title, onClick, disabled, danger }: { children: React.ReactNode; title: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button type="button" title={title} onClick={onClick} disabled={disabled}
      className={`inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors disabled:opacity-30 ${
        danger ? "text-muted-foreground hover:bg-red-50 hover:text-red-600" : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
      }`}>
      {children}
    </button>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-input bg-white px-2 text-sm">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex-1 block">
      {label && <span className="block text-[11px] text-muted-foreground mb-1">{label}</span>}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-8 text-sm px-2 rounded-md border border-input bg-white" />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex-1 block">
      {label && <span className="block text-[11px] text-muted-foreground mb-1">{label}</span>}
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
        className="w-full text-sm px-2 py-1.5 rounded-md border border-input bg-white leading-snug resize-y" />
    </label>
  );
}
