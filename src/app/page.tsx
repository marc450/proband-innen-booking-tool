import { redirect } from "next/navigation";

// On the booking domain (proband-innen.ephia.de) the middleware rewrites
// "/" to /kurse/werde-proband-in, so this file never runs. On any other
// host (localhost, previews) we still want a sane landing.
export default function Home() {
  redirect("/kurse/werde-proband-in");
}
