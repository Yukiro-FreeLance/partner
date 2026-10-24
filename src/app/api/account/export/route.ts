import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { exportAccount } from "@/lib/services/life";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in required.", { status: 401 });
  const data = await exportAccount(await getRepository(), user.profile.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=couplesync-export.json",
      "Cache-Control": "private, no-store",
    },
  });
}
