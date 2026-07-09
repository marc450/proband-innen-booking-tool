// LMS outline manager. Admin-only catalog of courses → chapters →
// lessons with create / rename / publish / reorder / delete. Content
// here lives entirely in the lms_* tables; nothing touches LearnWorlds.
import { redirect } from "next/navigation";
import { assertLmsAccess } from "@/lib/lms/admin-auth";
import { getAdminCourseCatalog } from "@/lib/lms/admin-queries";
import { LmsManager } from "./lms-manager";

export const dynamic = "force-dynamic";

export default async function LmsAdminPage() {
  if (!(await assertLmsAccess())) redirect("/dashboard");
  const catalog = await getAdminCourseCatalog();
  return <LmsManager initialCatalog={catalog} />;
}
