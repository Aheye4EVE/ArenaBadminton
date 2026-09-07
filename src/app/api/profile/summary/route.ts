import { getAuthenticatedProfileSummary } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const context = await getAuthenticatedProfileSummary();
    return Response.json(
      {
        account: context.summary,
        isAuthenticated: Boolean(context.user),
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch {
    return Response.json(
      { account: null, isAuthenticated: false },
      {
        status: 503,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }
}
