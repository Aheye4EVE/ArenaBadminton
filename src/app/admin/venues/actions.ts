"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export async function reviewVenueSuggestionAction(formData: FormData) {
  const suggestionId = z.string().uuid().safeParse(formData.get("suggestionId"));
  const decision = z.enum(["approved", "rejected"]).safeParse(formData.get("decision"));
  if (!suggestionId.success || !decision.success) redirect("/admin/venues?error=invalid");
  const { supabase, user } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");
  const { error } = await supabase.rpc("review_venue_suggestion", { p_suggestion_id: suggestionId.data, p_decision: decision.data, p_venue_id: null });
  if (error) redirect(`/admin/venues?error=${encodeURIComponent(error.message.includes("already") ? "already_reviewed" : "failed")}`);
  revalidatePath("/venues");
  revalidatePath("/admin/venues");
  redirect("/admin/venues?updated=1");
}
