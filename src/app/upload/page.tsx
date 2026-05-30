import { redirect } from "next/navigation";
import UploadClient from "./UploadClient";
import { pocketbaseServer } from "../../lib/server";

export default async function UploadPage() {
  const pocketbase = await pocketbaseServer();
  const { data } = await pocketbase.auth.getUser();

  if (!data.user) {
    redirect("/login?redirect=/upload");
  }

  return <UploadClient />;
}
