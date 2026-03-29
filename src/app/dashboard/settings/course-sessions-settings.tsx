"use client";

import { CourseSessionsManager } from "../auszubildende/course-sessions-manager";
import type { CourseTemplate, CourseSession, DozentUser } from "@/lib/types";

interface Props {
  initialSessions: CourseSession[];
  templates: CourseTemplate[];
  dozentUsers: DozentUser[];
}

export function CourseSessionsSettings({ initialSessions, templates, dozentUsers }: Props) {
  return (
    <CourseSessionsManager
      initialTemplates={templates}
      initialSessions={initialSessions}
      dozentUsers={dozentUsers}
    />
  );
}
