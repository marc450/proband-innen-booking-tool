import { redirect } from "next/navigation";

export default function DozentenRedirectPage() {
  redirect("/dashboard/settings?tab=dozenten");
}
