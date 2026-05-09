"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// Two local UI modes:
//   "login"       → email + password form, signs the staff user in
//                   and redirects to /dashboard.
//   "forgot"      → email-only form. Submitting POSTs to
//                   /api/admin/request-password-reset which sends a
//                   Resend-branded recovery email IF the address
//                   matches a staff user. We always show the same
//                   "wir haben Dir einen Link geschickt" confirmation
//                   regardless of the actual outcome to avoid leaking
//                   account existence (mirroring the customer flow at
//                   src/app/kurse/start/start-form.tsx).
type Mode = "login" | "forgot";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await fetch("/api/admin/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } finally {
      setForgotSent(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <img
        src="/logo-centered.svg"
        alt="EPHIA by Dr. Sophia"
        className="w-48 mb-10"
      />

      <div className="w-full max-w-sm bg-white rounded-[10px] shadow-sm p-8">
        {mode === "login" ? (
          <>
            <h1 className="text-xl font-bold text-center text-black mb-8">Staff Login</h1>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-semibold text-black">
                  E-Mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border-2 border-[#0066FF] rounded-[10px] px-4 py-3 text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 transition-shadow"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-semibold text-black">
                  Passwort
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border-2 border-[#0066FF] rounded-[10px] px-4 py-3 text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 transition-shadow"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-base rounded-[10px] py-3.5 disabled:opacity-50 transition-colors mt-2"
              >
                {loading ? "Anmelden..." : "Anmelden"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    setError(null);
                    setForgotSent(false);
                  }}
                  className="text-sm text-[#0066FF] hover:underline"
                >
                  Passwort vergessen?
                </button>
              </div>
            </form>
          </>
        ) : forgotSent ? (
          <>
            <h1 className="text-xl font-bold text-center text-black mb-4">Link gesendet</h1>
            <p className="text-sm text-black/80 mb-6 text-center leading-relaxed">
              Falls Deine E-Mail-Adresse hinterlegt ist, hast Du gleich einen Link zum
              Zurücksetzen Deines Passworts in Deinem Posteingang. Der Link ist 1 Stunde
              gültig.
            </p>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setForgotSent(false);
                setEmail("");
                setError(null);
              }}
              className="w-full bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-base rounded-[10px] py-3.5 transition-colors"
            >
              Zurück zur Anmeldung
            </button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-center text-black mb-2">Passwort vergessen</h1>
            <p className="text-sm text-black/70 mb-6 text-center">
              Wir schicken Dir einen Link zum Zurücksetzen.
            </p>
            <form onSubmit={handleForgot} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="forgot-email" className="block text-sm font-semibold text-black">
                  E-Mail
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full border-2 border-[#0066FF] rounded-[10px] px-4 py-3 text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 transition-shadow"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-base rounded-[10px] py-3.5 disabled:opacity-50 transition-colors mt-2"
              >
                {loading ? "Senden..." : "Link senden"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                  className="text-sm text-[#0066FF] hover:underline"
                >
                  Zurück zur Anmeldung
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
