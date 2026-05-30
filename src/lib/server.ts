import { getServerUser } from "@/lib/pocketbase/server";

export async function pocketbaseServer() {
  return {
    auth: {
      async getUser() {
        const user = await getServerUser();
        return { data: { user }, error: null };
      },
    },
  };
}
