"use client";

import { CourseSessionsManager } from "../auszubildende/course-sessions-manager";
import type { CourseTemplate, CourseSession } from "@/lib/types";

interface Props {
  initialSessions: CourseSession[];
  templates: CourseTemplate[];
}

export function CourseSessionsSettings({ initialSessions, templates }: Props) {
  return (
    <CourseSessionsManager
      initialTemplates={templates}
      initialSessions={initialSessions}
    />
  );
}
