"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronRight } from "lucide-react";
import type { Patient, Auszubildende } from "@/lib/types";

interface Props {
  patients: Patient[];
  auszubildende: Auszubildende[];
}

type Tab = "aerztinnen" | "probandinnen";

const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-500",
  warning: "bg-amber-500",
  blacklist: "bg-red-500",
};

function getPatientInitials(p: Patient) {
  const f = p.first_name?.[0] || "";
  const l = p.last_name?.[0] || "";
  return (f + l).toUpperCase() || "?";
}

function getPatientName(p: Patient) {
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
  return name || p.email || "Unbekannt";
}

function getAuszubildendeInitials(a: Auszubildende) {
  const f = a.first_name?.[0] || "";
  const l = a.last_name?.[0] || "";
  return (f + l).toUpperCase() || "?";
}

function getAuszubildendeName(a: Auszubildende) {
  const parts = [a.title, a.first_name, a.last_name].filter(Boolean).join(" ");
  return parts || a.email || "Unbekannt";
}

export function ContactsList({ patients, auszubildende }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("aerztinnen");
  const [search, setSearch] = useState("");

  const filteredPatients = patients.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    );
  });

  const filteredAuszubildende = auszubildende.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.first_name?.toLowerCase().includes(q) ||
      a.last_name?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-black mb-4">Kontakte</h1>

      {/* Tab toggle */}
      <div className="flex bg-white rounded-[10px] p-1 mb-4">
        <button
          onClick={() => { setTab("aerztinnen"); setSearch(""); }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === "aerztinnen"
              ? "bg-[#0066FF] text-white"
              : "text-gray-500"
          }`}
        >
          Ärzt:innen
        </button>
        <button
          onClick={() => { setTab("probandinnen"); setSearch(""); }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === "probandinnen"
              ? "bg-[#0066FF] text-white"
              : "text-gray-500"
          }`}
        >
          Proband:innen
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suchen..."
          className="w-full bg-white rounded-[10px] pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#0066FF]/30"
        />
      </div>

      {/* Count */}
      <p className="text-xs text-gray-500 mb-3">
        {tab === "aerztinnen"
          ? `${filteredAuszubildende.length} Ärzt:innen`
          : `${filteredPatients.length} Proband:innen`}
      </p>

      {/* Ärzt:innen list */}
      {tab === "aerztinnen" && (
        <div className="space-y-2">
          {filteredAuszubildende.map((a) => (
            <button
              key={a.id}
              onClick={() => router.push(`/m/kontakte/arzt/${a.id}`)}
              className="w-full bg-white rounded-[10px] px-4 py-3.5 flex items-center gap-3 active:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-[#0066FF]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-[#0066FF]">
                  {getAuszubildendeInitials(a)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-black truncate">
                  {getAuszubildendeName(a)}
                </div>
                {a.email && (
                  <div className="text-xs text-gray-500 truncate">{a.email}</div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </button>
          ))}
          {filteredAuszubildende.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">
              Keine Ärzt:innen gefunden.
            </p>
          )}
        </div>
      )}

      {/* Proband:innen list */}
      {tab === "probandinnen" && (
        <div className="space-y-2">
          {filteredPatients.map((patient) => (
            <button
              key={patient.id}
              onClick={() => router.push(`/m/kontakte/${patient.id}`)}
              className="w-full bg-white rounded-[10px] px-4 py-3.5 flex items-center gap-3 active:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-[#0066FF]/10 flex items-center justify-center flex-shrink-0 relative">
                <span className="text-sm font-bold text-[#0066FF]">
                  {getPatientInitials(patient)}
                </span>
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#F5F5F5] ${
                    STATUS_DOT[patient.patient_status || "active"] || STATUS_DOT.active
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-black truncate">
                  {getPatientName(patient)}
                </div>
                {patient.email && (
                  <div className="text-xs text-gray-500 truncate">{patient.email}</div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </button>
          ))}
          {filteredPatients.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">
              Keine Proband:innen gefunden.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
