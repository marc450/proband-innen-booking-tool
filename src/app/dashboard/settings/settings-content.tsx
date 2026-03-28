"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplatesManager } from "../templates-manager";
import { DozentenManager } from "../dozenten/dozenten-manager";
import { UsersManager } from "./users-manager";
import { CourseTemplate, Dozent } from "@/lib/types";
import { AdminUser } from "./page";

interface Props {
  initialTemplates: CourseTemplate[];
  initialDozenten: Dozent[];
  initialUsers: AdminUser[];
  currentUserId: string;
}

export function SettingsContent({
  initialTemplates,
  initialDozenten,
  initialUsers,
  currentUserId,
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
          <TabsTrigger value="dozenten">Dozent:innen</TabsTrigger>
          <TabsTrigger value="benutzer">Benutzer</TabsTrigger>
        </TabsList>

        <TabsContent value="kursvorlagen" className="mt-6">
          <TemplatesManager
            initialTemplates={initialTemplates}
            dozenten={initialDozenten}
          />
        </TabsContent>

        <TabsContent value="dozenten" className="mt-6">
          <DozentenManager initialDozenten={initialDozenten} />
        </TabsContent>

        <TabsContent value="benutzer" className="mt-6">
          <UsersManager initialUsers={initialUsers} currentUserId={currentUserId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
