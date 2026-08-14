import { redirect } from "next/navigation";

// The app has a single landing surface for now: /today. Send people there.
export default function Home() {
  redirect("/today");
}
