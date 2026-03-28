import { redirect } from "next/navigation";

export default function TemplatesRedirectPage() {
  redirect("/dashboard/settings?tab=kursvorlagen");
}
