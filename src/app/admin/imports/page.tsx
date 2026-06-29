import { redirect } from "next/navigation";
import { isGiveMeMidiAdmin } from "@/lib/givememidi-admin";
import { getServerUser } from "@/lib/pocketbase/server";
import ImportInboxClient from "./ImportInboxClient";

export const metadata = {
  title: "Import Inbox | GiveMeMIDI",
};

export default async function ImportInboxPage() {
  const user = await getServerUser();

  if (!user) redirect("/login?redirect=/admin/imports");
  if (!isGiveMeMidiAdmin(user.email)) redirect("/");

  return <ImportInboxClient />;
}