"use client";

import { CourseSessionsManager } from "../auszubildende/course-sessions-manager";
import type { CourseTemplate, CourseSession, DozentUser } from "@/lib/types";

interface Props {
  initialSessions: CourseSession[];
  templates: CourseTemplate[];
  dozentUsers: DozentUser[];
  betreuerUsers: DozentUser[];
  zahnmedizinerCounts: Record<string, number>;
}

export function CourseSessionsSettings({ initialSessions, templates, dozentUsers, betreuerUsers, zahnmedizinerCounts }: Props) {
  return (
    <CourseSessionsManager
      initialTemplates={templates}
      initialSessions={initialSessions}
      dozentUsers={dozentUsers}
      betreuerUsers={betreuerUsers}
      zahnmedizinerCounts={zahnmedizinerCounts}
    />
  );
}
