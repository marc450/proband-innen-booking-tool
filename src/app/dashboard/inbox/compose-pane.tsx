"use client";

import { useRef, useState } from "react";
import { Loader2, Send, X, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "./rich-text-editor";
import { ContactAutocomplete } from "./contact-autocomplete";

// Center-column compose view shown when the user clicks "Neue E-Mail".
// Replaces the old modal dialog: the draft shows up as a synthetic item
// in the left column and the editor fills the middle pane, so the
// contact sidebar on the right can follow the recipient in real time.

interface Props {
  to: string;
  subject: string;
  body: string;
  cc: string;
  bcc: string;
  sending: boolean;
  onToChange: (v: string) => void;
  onSubjectChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onCcChange: (v: string) => void;
  onBccChange: (v: string) => void;
  attachments: globalThis.File[];
  onAttachmentsChange: (files: globalThis.File[]) => void;
  onSend: () => void;
  onCancel: () => void;
}

export function ComposePane({
  to,
  subject,
  body,
  cc,
  bcc,
  sending,
  onToChange,
  onSubjectChange,
  onBodyChange,
  onCcChange,
  onBccChange,
  attachments,
  onAttachmentsChange,
  onSend,
  onCancel,
}: Props) {
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend = !!to.trim() && !!subject.trim() && body.trim().length > 0;
  return (
    <div className="flex flex-col h-full bg-gray-50/30">
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-bold">Neue E-Mail</h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
          title="Abbrechen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-[10px] p-5 space-y-4 max-w-3xl mx-auto">
          {/* To row */}
          <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
            <label className="text-xs font-medium text-gray-500 w-16 flex-shrink-0">
              An
            </label>
            <ContactAutocomplete
              value={to}
              onChange={onToChange}
              placeholder="Name oder E-Mail..."
              className="flex-1 border-0 !px-0 focus-visible:ring-0 h-8"
            />
            {(!showCc || !showBcc) && (
              <div className="flex gap-2 flex-shrink-0">
                {!showCc && (
                  <button
                    type="button"
                    onClick={() => setShowCc(true)}
                    className="text-xs text-[#0066FF] hover:underline font-medium"
                  >
                    CC
                  </button>
                )}
                {!showBcc && (
                  <button
                    type="button"
                    onClick={() => setShowBcc(true)}
                    className="text-xs text-[#0066FF] hover:underline font-medium"
                  >
                    BCC
                  </button>
                )}
              </div>
            )}
          </div>

          {/* CC row */}
          {showCc && (
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <label className="text-xs font-medium text-gray-500 w-16 flex-shrink-0">
                CC
              </label>
              <ContactAutocomplete
                value={cc}
                onChange={onCcChange}
                placeholder="Name oder E-Mail..."
                className="flex-1 border-0 !px-0 focus-visible:ring-0 h-8"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setShowCc(false);
                  onCcChange("");
                }}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* BCC row */}
          {showBcc && (
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <label className="text-xs font-medium text-gray-500 w-16 flex-shrink-0">
                BCC
              </label>
              <ContactAutocomplete
                value={bcc}
                onChange={onBccChange}
                placeholder="Name oder E-Mail..."
                className="flex-1 border-0 !px-0 focus-visible:ring-0 h-8"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setShowBcc(false);
                  onBccChange("");
                }}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Subject row */}
          <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
            <label className="text-xs font-medium text-gray-500 w-16 flex-shrink-0">
              Betreff
            </label>
            <Input
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
              placeholder="Betreff"
              className="flex-1 border-0 !px-0 focus-visible:ring-0 h-8"
            />
          </div>
          <RichTextEditor
            value={body}
            onChange={onBodyChange}
            placeholder="Deine Nachricht..."
            className="min-h-[360px]"
          />
        </div>
      </div>

      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div className="px-6 py-2 bg-white border-t border-gray-100 flex flex-wrap gap-2">
          {attachments.map((file, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700"
            >
              <Paperclip className="h-3 w-3 text-gray-400" />
              <span className="truncate max-w-[150px]">{file.name}</span>
              <span className="text-gray-400">{Math.round(file.size / 1024)} KB</span>
              <button
                onClick={() => onAttachmentsChange(attachments.filter((_, idx) => idx !== i))}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="border-t border-gray-100 bg-white px-6 py-3 flex items-center justify-between">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              onAttachmentsChange([...attachments, ...files]);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            title="Anhang hinzufügen"
          >
            <Paperclip className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button
            onClick={onSend}
            disabled={sending || !canSend}
            className="bg-[#0066FF] hover:bg-[#0055DD]"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Senden
          </Button>
        </div>
      </div>
    </div>
  );
}
