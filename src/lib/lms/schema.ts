// Hand-rolled validator + small utils for LMS lesson content.
//
// The reader's renderer (renderer.tsx) is a hand-written switch over a
// fixed node union. Its `default: return null` means any node it does
// not recognise silently disappears in the reader. To make that
// impossible, every write of a lesson `body` is validated here against
// the exact same union defined in types.ts. If validateTipTapDoc returns
// errors, the API refuses the save.
//
// We deliberately avoid a schema library (no Zod) — the project keeps
// the reader dependency-free and this validator is small and explicit.
// When you add a node type to types.ts and renderer.tsx, add it here too.

import type { TipTapDoc } from "./types";

type Json = unknown;

// The node types the renderer knows about. Keep in sync with the
// TipTapNode union in types.ts and the switch in renderer.tsx.
const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "callout",
  "summaryBand",
  "summaryCard",
  "video",
  "figure",
  "ctaButton",
  "quiz",
  "motivationBlock",
  "text",
]);

const CALLOUT_VARIANTS = new Set(["signal", "rose", "brown1", "think"]);
const MARK_TYPES = new Set(["bold", "italic", "link"]);

function isObject(v: Json): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validateMarks(marks: Json, path: string, errors: string[]) {
  if (marks === undefined) return;
  if (!Array.isArray(marks)) {
    errors.push(`${path}.marks must be an array`);
    return;
  }
  marks.forEach((m, i) => {
    if (!isObject(m) || typeof m.type !== "string" || !MARK_TYPES.has(m.type)) {
      errors.push(`${path}.marks[${i}] has an unknown mark type`);
    }
  });
}

function validateNode(node: Json, path: string, errors: string[]) {
  if (!isObject(node)) {
    errors.push(`${path} is not an object`);
    return;
  }
  const type = node.type;
  if (typeof type !== "string" || !BLOCK_TYPES.has(type)) {
    errors.push(`${path} has unknown node type "${String(type)}"`);
    return;
  }

  switch (type) {
    case "text": {
      if (typeof node.text !== "string") {
        errors.push(`${path} (text) is missing a string "text"`);
      }
      validateMarks(node.marks, path, errors);
      return;
    }
    case "heading": {
      const lvl = isObject(node.attrs) ? node.attrs.level : undefined;
      if (lvl !== 1 && lvl !== 2 && lvl !== 3) {
        errors.push(`${path} (heading) needs attrs.level of 1, 2 or 3`);
      }
      break;
    }
    case "callout": {
      const v = isObject(node.attrs) ? node.attrs.variant : undefined;
      if (typeof v !== "string" || !CALLOUT_VARIANTS.has(v)) {
        errors.push(`${path} (callout) needs attrs.variant of signal|rose|brown1|think`);
      }
      break;
    }
    case "summaryBand": {
      const v = isObject(node.attrs) ? node.attrs.variant : undefined;
      if (v !== "signal") {
        errors.push(`${path} (summaryBand) needs attrs.variant "signal"`);
      }
      break;
    }
    case "video": {
      const id = isObject(node.attrs) ? node.attrs.cfStreamVideoId : "MISSING";
      if (id !== null && typeof id !== "string") {
        errors.push(`${path} (video) needs attrs.cfStreamVideoId (string or null)`);
      }
      return; // leaf node, no children
    }
    case "figure": {
      const a = isObject(node.attrs) ? node.attrs : {};
      if (typeof a.src !== "string" || !a.src) {
        errors.push(`${path} (figure) needs a non-empty attrs.src`);
      }
      if (typeof a.alt !== "string") {
        errors.push(`${path} (figure) needs attrs.alt (string)`);
      }
      return; // leaf node
    }
    case "ctaButton": {
      const a = isObject(node.attrs) ? node.attrs : {};
      if (typeof a.label !== "string" || !a.label) {
        errors.push(`${path} (ctaButton) needs attrs.label`);
      }
      if (typeof a.href !== "string" || !a.href) {
        errors.push(`${path} (ctaButton) needs attrs.href`);
      }
      return; // leaf node
    }
    case "motivationBlock": {
      const a = isObject(node.attrs) ? node.attrs : {};
      if (typeof a.message !== "string" || !a.message) {
        errors.push(`${path} (motivationBlock) needs attrs.message`);
      }
      return; // leaf node
    }
    case "quiz": {
      const a = isObject(node.attrs) ? node.attrs : {};
      if (!Array.isArray(a.questions) || a.questions.length === 0) {
        errors.push(`${path} (quiz) needs a non-empty attrs.questions array`);
        return;
      }
      a.questions.forEach((q, qi) => {
        const qp = `${path}.questions[${qi}]`;
        if (!isObject(q) || typeof q.question !== "string" || !q.question) {
          errors.push(`${qp} needs a "question" string`);
        }
        const opts = isObject(q) ? q.options : undefined;
        if (!Array.isArray(opts) || opts.length < 2) {
          errors.push(`${qp} needs at least two options`);
          return;
        }
        if (!opts.some((o) => isObject(o) && o.correct === true)) {
          errors.push(`${qp} needs at least one correct option`);
        }
        opts.forEach((o, oi) => {
          if (!isObject(o) || typeof o.text !== "string") {
            errors.push(`${qp}.options[${oi}] needs a "text" string`);
          }
          if (isObject(o) && typeof o.correct !== "boolean") {
            errors.push(`${qp}.options[${oi}] needs a boolean "correct"`);
          }
        });
      });
      return; // leaf node (attrs only)
    }
  }

  // Container nodes: recurse into children when present.
  if (node.content !== undefined) {
    if (!Array.isArray(node.content)) {
      errors.push(`${path}.content must be an array`);
      return;
    }
    node.content.forEach((child, i) =>
      validateNode(child, `${path}.content[${i}]`, errors),
    );
  }
}

export type ValidationResult =
  | { ok: true; doc: TipTapDoc }
  | { ok: false; errors: string[] };

// Validate a parsed JSON value as a TipTap doc the renderer can render.
export function validateTipTapDoc(value: Json): ValidationResult {
  const errors: string[] = [];
  if (!isObject(value) || value.type !== "doc") {
    return { ok: false, errors: ['Root node must be { "type": "doc", ... }'] };
  }
  if (value.content !== undefined && !Array.isArray(value.content)) {
    return { ok: false, errors: ["doc.content must be an array"] };
  }
  (Array.isArray(value.content) ? value.content : []).forEach((child, i) =>
    validateNode(child, `content[${i}]`, errors),
  );
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, doc: value as unknown as TipTapDoc };
}

// Parse a JSON string then validate. Returns a parse error as a single
// entry so the caller can surface one path for both failure modes.
export function parseAndValidateDoc(raw: string): ValidationResult {
  let parsed: Json;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return {
      ok: false,
      errors: [`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`],
    };
  }
  return validateTipTapDoc(parsed);
}

// URL-safe slug from a German title. Maps umlauts, lowercases, strips
// everything else to single hyphens. Empty input yields "".
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
