import { redirect } from "next/navigation";

// Legacy URL. The courses overview now lives at the booking domain root,
// which the middleware rewrites to /kurse/werde-proband-in. Anyone hitting
// /book directly (old bookmark, internal link) is sent home.
export default function BookPage() {
  redirect("/");
}
