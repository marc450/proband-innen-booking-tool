"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronRight } from "lucide-react";
import type { Patient } from "@/lib/types";

interface Props {
  patients: Patient[];
}

const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-500",
  warning: "bg-amber-500",
  blacklist: "bg-red-500",
};

function getInitials(p: Patient) {
  const f = p.first_name?.[0] || "";
  const l = p.last_name?.[0] || "";
  return (f + l).toUpperCase() || "?";
}

function getDisplayName(p: Patient) {
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
  return name || p.email || "Unbekannt";
}

export function ContactsList({ patients }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = patients.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.first_name?.toLowerCase().includes(q)) ||
      (p.last_name?.toLowerCase().includes(q)) ||
      (p.email?.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      {/* Header */}
      <h1 className="text-xl font-bold text-black mb-4">Kontakte</h1>

      {/* Search */}
      <div className="relative mb-4">
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
        {filtered.length} Kontakt{filtered.length !== 1 ? "e" : ""}
      </p>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((patient) => (
          <button
            key={patient.id}
            onClick={() => router.push(`/m/kontakte/${patient.id}`)}
            className="w-full bg-white rounded-[10px] px-4 py-3.5 flex items-center gap-3 active:bg-gray-50 transition-colors text-left"
          >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-[#0066FF]/10 flex items-center justify-center flex-shrink-0 relative">
              <span className="text-sm font-bold text-[#0066FF]">
                {getInitials(patient)}
              </span>
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                  STATUS_DOT[patient.patient_status || "active"] || STATUS_DOT.active
                }`}
              />
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-black truncate">
                {getDisplayName(patient)}
              </div>
              {patient.email && (
                <div className="text-xs text-gray-500 truncate">
                  {patient.email}
                </div>
              )}
            </div>

            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
          </button>
        ))}

        {filtered.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">
            Keine Kontakte gefunden.
          </p>
        )}
      </div>
    </div>
  );
}
