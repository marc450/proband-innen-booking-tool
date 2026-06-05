// Shared guard for the inbox send paths (reply + compose).
//
// A POST to /api/gmail/send that is too large never reaches the server:
// the platform proxy resets the connection mid-upload and the browser
// surfaces a bare "Load failed" (Safari) / "Failed to fetch" (Chrome).
// The usual trigger is an inline base64 image pasted into the body or an
// oversized attachment. We check the approximate request size up front so
// staff get an actionable message instead of a silent failure.
//
// The cap is intentionally well below Gmail's own 25 MB limit because the
// bottleneck in practice is the reverse proxy / request-body limit in
// front of the app, not Gmail.

export const MAX_SEND_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

interface SizedAttachment {
  // base64-encoded content (already inflated ~33% over the raw bytes)
  content: string;
}

// Matches an <img> whose src is an inline base64 data URI anywhere in the
// body. These are the multi-MB blobs that get pasted in from other emails
// or documents and silently blow past the upload limit.
const INLINE_DATA_IMAGE_RE = /<img[^>]+src=["']?\s*data:/i;

/**
 * Returns a German error message when the composed mail cannot be sent
 * safely, or null when it is safe to POST. `htmlBody` is the full HTML
 * that will be sent; `attachments` carry their base64 content.
 *
 * Two guards:
 *  1. An inline base64 image in the body — flagged regardless of size,
 *     because even a small one breaks the send AND is never what the user
 *     actually wants in an outgoing mail. This deterministically catches
 *     drafts that were saved with a pasted image before the paste handler
 *     started stripping them.
 *  2. Total payload over the cap — covers oversized attachments.
 */
export function checkSendPayloadSize(
  htmlBody: string,
  attachments: SizedAttachment[],
): string | null {
  if (INLINE_DATA_IMAGE_RE.test(htmlBody)) {
    return (
      `Im Text ist ein eingefügtes Bild enthalten, dadurch kann die E-Mail ` +
      `nicht gesendet werden. Bitte lösche das Bild aus dem Text (oder ` +
      `verwerfe den Entwurf und schreibe ihn neu) und hänge Bilder über die ` +
      `Büroklammer als Anhang an.`
    );
  }

  let bytes = htmlBody.length;
  for (const a of attachments) bytes += a.content.length;

  if (bytes <= MAX_SEND_PAYLOAD_BYTES) return null;

  const mb = (bytes / (1024 * 1024)).toFixed(1);
  return (
    `Die E-Mail ist zu groß (ca. ${mb} MB) und kann nicht gesendet werden. ` +
    `Bitte verkleinere große Anhänge oder verschicke große Dateien per Link.`
  );
}
