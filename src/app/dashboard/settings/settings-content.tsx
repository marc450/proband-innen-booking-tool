"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
}

export function SettingsContent({
  initialUsers,
  currentUserId,
  initialCourseOfferings,
  initialCourseSessions,
  dozentUsers,
  betreuerUsers,
  initialAuszubildende,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") || "kurstermine";

  const handleTabChange = (value: string) => {
    router.replace(`/dashboard/settings?tab=${value}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="kurstermine">Kurstermine</TabsTrigger>
          <TabsTrigger value="kursangebot">Kurse</TabsTrigger>
          <TabsTrigger value="rabattcodes">Rabattcodes</TabsTrigger>
          <TabsTrigger value="rechnungen">Rechnungen</TabsTrigger>
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
            betreuerUsers={betreuerUsers}
          />
        </TabsContent>

        <TabsContent value="rabattcodes" className="mt-6">
          <DiscountCodesManager />
        </TabsContent>

        <TabsContent value="rechnungen" className="mt-6">
          <RechnungenManager initialAuszubildende={initialAuszubildende} />
        </TabsContent>

        <TabsContent value="benutzer" className="mt-6">
          <UsersManager initialUsers={initialUsers} currentUserId={currentUserId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
