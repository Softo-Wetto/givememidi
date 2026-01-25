import { redirect } from "next/navigation";
import UploadClient from "./UploadClient";
import { supabaseServer } from "../../lib/server";

export default async function UploadPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login?redirect=/upload");
  }

  return <UploadClient />;
}
