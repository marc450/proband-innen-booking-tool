"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersManager } from "./users-manager";
import { CourseOfferingManager } from "./course-offering-manager";
import { CourseSessionsSettings } from "./course-sessions-settings";
import { CourseTemplate, CourseSession, DozentUser } from "@/lib/types";
import { AdminUser } from "./page";

interface Props {
  initialUsers: AdminUser[];
  currentUserId: string;
  initialCourseOfferings: CourseTemplate[];
  initialCourseSessions: CourseSession[];
  dozentUsers: DozentUser[];
}

export function SettingsContent({
  initialUsers,
  currentUserId,
  initialCourseOfferings,
  initialCourseSessions,
  dozentUsers,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") || "kurstermine";

  const handleTabChange = (value: string) => {
    router.replace(`/dashboard/settings?tab=${value}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Einstellungen</h1>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="kurstermine">Kurstermine</TabsTrigger>
          <TabsTrigger value="kursangebot">Kurse</TabsTrigger>
          <TabsTrigger value="benutzer">Benutzer:innen</TabsTrigger>
        </TabsList>

        <TabsContent value="kursangebot" className="mt-6">
          <CourseOfferingManager initialOfferings={initialCourseOfferings} />
        </TabsContent>

        <TabsContent value="kurstermine" className="mt-6">
          <CourseSessionsSettings
            initialSessions={initialCourseSessions}
            templates={initialCourseOfferings}
            dozentUsers={dozentUsers}
          />
        </TabsContent>

        <TabsContent value="benutzer" className="mt-6">
          <UsersManager initialUsers={initialUsers} currentUserId={currentUserId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
