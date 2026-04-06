"use client";

import { useState } from "react";
import { ChevronDown, MapPin, User, Clock } from "lucide-react";
import type { Course, Slot } from "@/lib/types";

interface Props {
  courses: Course[];
  slots: Slot[];
  slotBookingCounts: Record<string, number>;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(timeStr: string) {
  return timeStr?.slice(0, 5) || "";
}

function getFillColor(booked: number, capacity: number) {
  const ratio = booked / capacity;
  if (ratio >= 1) return "text-red-600 bg-red-50";
  if (ratio >= 0.7) return "text-amber-600 bg-amber-50";
  return "text-emerald-600 bg-emerald-50";
}

export function CoursesOverview({ courses, slots, slotBookingCounts }: Props) {
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

  return (
    <div>
      <h1 className="text-xl font-bold text-black mb-4">Termine</h1>

      {courses.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-8">
          Keine aktiven Kurse.
        </p>
      )}

      <div className="space-y-3">
        {courses.map((course) => {
          const courseSlots = getSlotsForCourse(course.id);
          const isExpanded = expanded.has(course.id);

          return (
            <div key={course.id} className="bg-white rounded-[10px] overflow-hidden">
              {/* Course header */}
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
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400">
                      {courseSlots.length} Slot{courseSlots.length !== 1 ? "s" : ""}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>
              </button>

              {/* Slots */}
              {isExpanded && courseSlots.length > 0 && (
                <div className="px-4 pb-4 space-y-2">
                  {courseSlots.map((slot) => {
                    const booked = slotBookingCounts[slot.id] || 0;
                    const fillColor = getFillColor(booked, slot.capacity);

                    return (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5"
                      >
                        <div className="flex items-center gap-2 text-sm text-black">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {formatTime(slot.start_time)}
                          {slot.end_time ? ` – ${formatTime(slot.end_time)}` : ""}
                        </div>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${fillColor}`}
                        >
                          {booked}/{slot.capacity}
                        </span>
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
    </div>
  );
}
