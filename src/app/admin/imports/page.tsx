import { redirect } from "next/navigation";
import { isGiveMeMidiAdmin } from "@/lib/givememidi-admin";
import { getServerAuth } from "@/lib/pocketbase/server";
import ImportInboxClient from "./ImportInboxClient";

export const metadata = {
  title: "Import Inbox | GiveMeMIDI",
};

export default async function ImportInboxPage() {
  const auth = await getServerAuth();

  if (!auth?.user) redirect("/login?redirect=/admin/imports");
  if (!isGiveMeMidiAdmin(auth.user.email)) redirect("/");

  return <ImportInboxClient />;
}