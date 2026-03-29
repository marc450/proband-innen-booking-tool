"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplatesManager } from "../templates-manager";
import { UsersManager } from "./users-manager";
import { CourseOfferingManager } from "./course-offering-manager";
import { CourseSessionsSettings } from "./course-sessions-settings";
import { CourseTemplate, CourseSession } from "@/lib/types";
import { AdminUser } from "./page";

interface Props {
  initialTemplates: CourseTemplate[];
  initialUsers: AdminUser[];
  currentUserId: string;
  initialCourseOfferings: CourseTemplate[];
  initialCourseSessions: CourseSession[];
}

export function SettingsContent({
  initialTemplates,
  initialUsers,
  currentUserId,
  initialCourseOfferings,
  initialCourseSessions,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") || "kursvorlagen";

  const handleTabChange = (value: string) => {
    router.replace(`/dashboard/settings?tab=${value}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Einstellungen</h1>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="kursvorlagen">Kursvorlagen</TabsTrigger>
          <TabsTrigger value="benutzer">Benutzer</TabsTrigger>
          <TabsTrigger value="kursangebot">Kursangebot</TabsTrigger>
          <TabsTrigger value="kurstermine">Kurstermine</TabsTrigger>
        </TabsList>

        <TabsContent value="kursvorlagen" className="mt-6">
          <TemplatesManager
            initialTemplates={initialTemplates}
            dozenten={[]}
          />
        </TabsContent>

        <TabsContent value="benutzer" className="mt-6">
          <UsersManager initialUsers={initialUsers} currentUserId={currentUserId} />
        </TabsContent>

        <TabsContent value="kursangebot" className="mt-6">
          <CourseOfferingManager initialOfferings={initialCourseOfferings} />
        </TabsContent>

        <TabsContent value="kurstermine" className="mt-6">
          <CourseSessionsSettings
            initialSessions={initialCourseSessions}
            templates={initialCourseOfferings}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
