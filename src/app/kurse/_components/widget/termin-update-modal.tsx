"use client";

import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { X, Loader2, CheckCircle } from "lucide-react";

interface Props {
  onClose: () => void;
}

const TITLE_OPTIONS = ["Dr.", "Prof. Dr.", "PD Dr.", "Prof.", "Kein Titel"];

export function TerminUpdateModal({ onClose }: Props) {
  const [title, setTitle] = useState("Dr.");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  const [scrollTop, setScrollTop] = useState(0);
  const isIframe = typeof window !== "undefined" && window.parent !== window;

  useEffect(() => {
    setMounted(true);
    setScrollTop(window.scrollY || document.documentElement.scrollTop);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privacy) {
      setError("Bitte stimme der Datenschutzerklärung zu.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/hubspot-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, firstName, lastName, email }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Fehler beim Speichern.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Unerwarteter Fehler. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  };

  const overlayStyle: React.CSSProperties = isIframe
    ? { position: "absolute", top: scrollTop, left: 0, right: 0, height: window.innerHeight, backgroundColor: "rgba(0,0,0,0.5)" }
    : { backgroundColor: "rgba(0,0,0,0.5)" };
  const overlayClass = isIframe
    ? "z-[9999] flex items-center justify-center p-4"
    : "fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto";

  const modal = (
    <div
      className={overlayClass}
      style={overlayStyle}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl relative my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Schließen"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          {success ? (
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
              <h2 className="text-xl font-bold text-black">Danke!</h2>
              <p className="text-gray-600">
                Wir halten Dich über neue Termine auf dem Laufenden.
              </p>
              <button
                onClick={onClose}
                className="mt-2 bg-[#0066FF] hover:bg-[#0055DD] text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
              >
                Schließen
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-black mb-1">Termin-Updates erhalten</h2>
              <p className="text-gray-500 text-sm mb-6">
                Wir informieren Dich, sobald neue Termine verfügbar sind.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Titel</label>
                  <select
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-black focus:outline-none focus:border-[#0066FF] bg-white"
                  >
                    {TITLE_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Vorname <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-black focus:outline-none focus:border-[#0066FF]"
                      placeholder="Max"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nachname <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-black focus:outline-none focus:border-[#0066FF]"
                      placeholder="Mustermann"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">E-Mail <span className="text-red-400">*</span></label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-black focus:outline-none focus:border-[#0066FF]"
                    placeholder="max@praxis.de"
                  />
                </div>

                <div className="flex items-start gap-3 pt-1">
                  <input
                    type="checkbox"
                    id="privacy"
                    checked={privacy}
                    onChange={(e) => setPrivacy(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#0066FF] flex-shrink-0 cursor-pointer"
                  />
                  <label htmlFor="privacy" className="text-sm text-gray-600 cursor-pointer leading-relaxed">
                    Ich habe die{" "}
                    <a
                      href="/datenschutz"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0066FF] underline"
                    >
                      Datenschutzerklärung
                    </a>{" "}
                    gelesen und stimme zu.
                  </label>
                </div>

                {error && (
                  <p className="text-red-500 text-sm">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0066FF] hover:bg-[#0055DD] text-white font-semibold py-3 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-colors mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Wird gesendet...
                    </>
                  ) : (
                    "Updates erhalten"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return ReactDOM.createPortal(modal, document.body);
}
