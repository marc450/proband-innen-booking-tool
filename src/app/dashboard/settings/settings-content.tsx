"use client";

import { useSearchParams } from "next/navigation";
import { UsersManager } from "./users-manager";
import { CourseOfferingManager } from "./course-offering-manager";
import { CourseSessionsSettings } from "./course-sessions-settings";
import { DiscountCodesManager } from "./discount-codes-manager";
import { RechnungenManager } from "./rechnungen-manager";
import { CourseTemplate, CourseSession, DozentUser, Auszubildende } from "@/lib/types";
import { AdminUser } from "./page";

type AuszubildendePick = Pick<Auszubildende, "id" | "first_name" | "last_name" | "email" | "phone" | "title">;

interface Props {
  initialUsers: AdminUser[];
  currentUserId: string;
  initialCourseOfferings: CourseTemplate[];
  initialCourseSessions: CourseSession[];
  dozentUsers: DozentUser[];
  betreuerUsers: DozentUser[];
  initialAuszubildende: AuszubildendePick[];
  dentistSessionIds: string[];
}

const TAB_TITLES: Record<string, string> = {
  kurstermine: "Kurstermine",
  kursangebot: "Kurse",
  rabattcodes: "Rabattcodes",
  rechnungen: "Zahlungsverläufe",
  benutzer: "Benutzer:innen",
};

export function SettingsContent({
  initialUsers,
  currentUserId,
  initialCourseOfferings,
  initialCourseSessions,
  dozentUsers,
  betreuerUsers,
  initialAuszubildende,
  dentistSessionIds,
}: Props) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "kurstermine";
  const title = TAB_TITLES[tab] || "Admin";

  const renderContent = () => {
    switch (tab) {
      case "kursangebot":
        return <CourseOfferingManager initialOfferings={initialCourseOfferings} />;
      case "rabattcodes":
        return <DiscountCodesManager />;
      case "rechnungen":
        return <RechnungenManager initialAuszubildende={initialAuszubildende} />;
      case "benutzer":
        return <UsersManager initialUsers={initialUsers} currentUserId={currentUserId} />;
      case "kurstermine":
      default:
        return (
          <CourseSessionsSettings
            initialSessions={initialCourseSessions}
            templates={initialCourseOfferings}
            dozentUsers={dozentUsers}
            betreuerUsers={betreuerUsers}
            dentistSessionIds={dentistSessionIds}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      {renderContent()}
    </div>
  );
}
