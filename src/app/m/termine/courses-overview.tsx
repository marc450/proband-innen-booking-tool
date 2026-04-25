"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, MapPin, User, Clock, Users } from "lucide-react";
import type { Course, Slot, CourseTemplate, CourseSession } from "@/lib/types";

export interface SlotBooking {
  id: string;
  patientId: string | null;
  name: string;
}

interface Props {
  courses: Course[];
  slots: Slot[];
  slotBookings: Record<string, SlotBooking[]>;
  templates: CourseTemplate[];
  sessions: CourseSession[];
}

type Tab = "kurstermine" | "behandlungstermine";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(timeStr: string | null | undefined) {
  if (!timeStr) return "";
  // `slots.start_time` is a timestamptz ("2026-05-10T14:30:00+00:00"), and
  // `course_sessions.start_time` is a plain "HH:MM:SS". Handle both by
  // detecting the ISO shape and parsing via Date for those.
  if (timeStr.includes("T")) {
    const d = new Date(timeStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Berlin",
    });
  }
  return timeStr.slice(0, 5);
}

function getFillColor(booked: number, capacity: number) {
  const ratio = booked / capacity;
  if (ratio >= 1) return "text-emerald-600 bg-emerald-50";
  if (ratio >= 0.7) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
}

export function CoursesOverview({
  courses,
  slots,
  slotBookings,
  templates,
  sessions,
}: Props) {
  const [tab, setTab] = useState<Tab>("kurstermine");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getSlotsForCourse = (courseId: string) =>
    slots.filter((s) => s.course_id === courseId);

  const getTemplateName = (templateId: string) => {
    const t = templates.find((t) => t.id === templateId);
    return t?.course_label_de || t?.title || "Unbekannt";
  };

  // Only show live sessions for Kurstermine
  const liveSessions = sessions.filter((s) => s.is_live);

  return (
    <div>
      <h1 className="text-xl font-bold text-black mb-4">Termine</h1>

      {/* Tab toggle */}
      <div className="flex bg-white rounded-[10px] p-1 mb-4">
        <button
          onClick={() => { setTab("kurstermine"); setExpanded(new Set()); }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === "kurstermine"
              ? "bg-[#0066FF] text-white"
              : "text-gray-500"
          }`}
        >
          Kurstermine
        </button>
        <button
          onClick={() => { setTab("behandlungstermine"); setExpanded(new Set()); }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === "behandlungstermine"
              ? "bg-[#0066FF] text-white"
              : "text-gray-500"
          }`}
        >
          Behandlungstermine
        </button>
      </div>

      {/* Kurstermine (course sessions for Auszubildende) */}
      {tab === "kurstermine" && (
        <div className="space-y-3">
          {liveSessions.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">
              Keine Live-Kurstermine.
            </p>
          )}
          {liveSessions.map((session) => (
            <Link
              key={session.id}
              href={`/m/termine/sessions/${session.id}`}
              className="block bg-white rounded-[10px] p-4 active:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-black">
                    {getTemplateName(session.template_id)}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(session.date_iso)}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                    {session.instructor_name && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {session.instructor_name}
                      </span>
                    )}
                    {session.address && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {session.address}
                      </span>
                    )}
                    {session.start_time && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(session.start_time)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      getFillColor(session.booked_seats, session.max_seats)
                    }`}
                  >
                    <Users className="w-3 h-3 inline mr-0.5" />
                    {session.booked_seats}/{session.max_seats}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Behandlungstermine (Proband:innen courses with slots) */}
      {tab === "behandlungstermine" && (
        <div className="space-y-3">
          {courses.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">
              Keine aktiven Behandlungstermine.
            </p>
          )}
          {courses.map((course) => {
            const courseSlots = getSlotsForCourse(course.id);
            const isExpanded = expanded.has(course.id);

            return (
              <div key={course.id} className="bg-white rounded-[10px] overflow-hidden">
                <button
                  onClick={() => toggle(course.id)}
                  className="w-full p-4 text-left active:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-black">
                        {course.title}
                      </h3>
                      {course.course_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(course.course_date)}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                        {course.location && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {course.location}
                          </span>
                        )}
                        {course.instructor && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {course.instructor}
                          </span>
                        )}
                      </div>
                    </div>
                    {(() => {
                      const totalCapacity = courseSlots.reduce((sum, s) => sum + s.capacity, 0);
                      const totalBooked = courseSlots.reduce(
                        (sum, s) => sum + (slotBookings[s.id]?.length || 0),
                        0,
                      );
                      const isFull = totalCapacity > 0 && totalBooked >= totalCapacity;
                      return (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              isFull ? "text-emerald-600 bg-emerald-50" : "text-gray-600 bg-gray-100"
                            }`}
                          >
                            <Users className="w-3 h-3 inline mr-0.5" />
                            {totalBooked}/{totalCapacity}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-gray-400 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      );
                    })()}
                  </div>
                </button>

                {isExpanded && courseSlots.length > 0 && (
                  <div className="px-4 pb-4 space-y-2">
                    {courseSlots.map((slot) => {
                      const bookingsForSlot = slotBookings[slot.id] || [];
                      const booked = bookingsForSlot.length;
                      const fillColor = getFillColor(booked, slot.capacity);
                      const timeLabel = `${formatTime(slot.start_time)}${
                        slot.end_time ? ` bis ${formatTime(slot.end_time)}` : ""
                      }`;
                      return (
                        <div key={slot.id} className="bg-gray-50 rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-2.5">
                            <div className="flex items-center gap-2 text-sm text-black">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              {timeLabel}
                            </div>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${fillColor}`}>
                              {booked}/{slot.capacity}
                            </span>
                          </div>
                          {bookingsForSlot.length > 0 && (
                            <div className="border-t border-gray-100 bg-white">
                              {bookingsForSlot.map((b) => {
                                const row = (
                                  <div className="flex items-center justify-between px-3 py-2 active:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-2 text-sm text-black min-w-0">
                                      <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                      <span className="truncate">{b.name}</span>
                                    </div>
                                    {b.patientId && (
                                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    )}
                                  </div>
                                );
                                return b.patientId ? (
                                  <Link
                                    key={b.id}
                                    href={`/m/kontakte/${b.patientId}`}
                                    className="block"
                                  >
                                    {row}
                                  </Link>
                                ) : (
                                  <div key={b.id}>{row}</div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {isExpanded && courseSlots.length === 0 && (
                  <div className="px-4 pb-4">
                    <p className="text-xs text-gray-400">Keine Slots angelegt.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
