import type { Metadata } from "next";
import CommunityBrowser, { type CommunityComment, type CommunityPost, type CommunityProfile } from "@/components/community-browser";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Community | Arena-Badminton" };
export const dynamic = "force-dynamic";

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback = 1) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function profileFromRow(row: Record<string, unknown> | undefined): CommunityProfile {
  return {
    displayName: textValue(row?.display_name, "ผู้เล่น Arena"),
    handle: textValue(row?.handle, "arena_player"),
    avatarUrl: typeof row?.avatar_url === "string" ? row.avatar_url : null,
    level: Math.max(1, Math.min(99, numberValue(row?.level))),
  };
}

export default async function CommunityPage() {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) return <CommunityBrowser posts={[]} currentProfile={null} signedIn={false} />;

  const { data: rawPosts } = await supabase
    .from("social_posts")
    .select("id, user_id, body, image_url, created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(30);

  const postRows = (rawPosts ?? []) as Array<Record<string, unknown>>;
  const postIds = postRows.map((post) => textValue(post.id)).filter(Boolean);
  const authorIds = [...new Set(postRows.map((post) => textValue(post.user_id)).filter(Boolean))];

  const [authorsResult, commentsResult, likesResult, myLikesResult] = await Promise.all([
    authorIds.length > 0 ? supabase.from("public_profiles").select("id, display_name, handle, avatar_url, level").in("id", authorIds) : Promise.resolve({ data: [] }),
    postIds.length > 0 ? supabase.from("social_post_comments").select("id, post_id, user_id, body, created_at").in("post_id", postIds).eq("status", "published").order("created_at", { ascending: true }).limit(120) : Promise.resolve({ data: [] }),
    postIds.length > 0 ? supabase.from("social_post_likes").select("post_id").in("post_id", postIds) : Promise.resolve({ data: [] }),
    postIds.length > 0 ? supabase.from("social_post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds) : Promise.resolve({ data: [] }),
  ]);

  const commentRows = (commentsResult.data ?? []) as Array<Record<string, unknown>>;
  const commentAuthorIds = [...new Set(commentRows.map((comment) => textValue(comment.user_id)).filter(Boolean))];
  const { data: commentAuthors } = commentAuthorIds.length > 0
    ? await supabase.from("public_profiles").select("id, display_name, handle, avatar_url, level").in("id", commentAuthorIds)
    : { data: [] };

  const authorMap = new Map(((authorsResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [textValue(row.id), profileFromRow(row)]));
  const commentAuthorMap = new Map(((commentAuthors ?? []) as Array<Record<string, unknown>>).map((row) => [textValue(row.id), profileFromRow(row)]));
  const likeCounts = new Map<string, number>();
  for (const like of (likesResult.data ?? []) as Array<Record<string, unknown>>) {
    const postId = textValue(like.post_id);
    likeCounts.set(postId, (likeCounts.get(postId) ?? 0) + 1);
  }
  const myLikes = new Set(((myLikesResult.data ?? []) as Array<Record<string, unknown>>).map((like) => textValue(like.post_id)));
  const commentsByPost = new Map<string, CommunityComment[]>();
  for (const comment of commentRows) {
    const postId = textValue(comment.post_id);
    const author = commentAuthorMap.get(textValue(comment.user_id));
    if (!postId || !author) continue;
    const comments = commentsByPost.get(postId) ?? [];
    comments.push({ id: textValue(comment.id), postId, body: textValue(comment.body), createdAt: textValue(comment.created_at), author });
    commentsByPost.set(postId, comments);
  }

  const posts: CommunityPost[] = postRows.map((post) => {
    const id = textValue(post.id);
    return {
      id,
      body: textValue(post.body),
      imageUrl: typeof post.image_url === "string" && /^https:\/\//i.test(post.image_url) ? post.image_url : null,
      createdAt: textValue(post.created_at),
      author: authorMap.get(textValue(post.user_id)) ?? { displayName: "ผู้เล่น Arena", handle: "arena_player", avatarUrl: null, level: 1 },
      likeCount: likeCounts.get(id) ?? 0,
      commentCount: commentsByPost.get(id)?.length ?? 0,
      isLiked: myLikes.has(id),
      comments: commentsByPost.get(id)?.slice(0, 3) ?? [],
    };
  });

  const currentProfile: CommunityProfile = {
    displayName: textValue(profile?.display_name, "ผู้เล่น Arena"),
    handle: textValue(profile?.handle, "arena_player"),
    avatarUrl: typeof profile?.avatar_url === "string" ? profile.avatar_url : null,
    level: Math.max(1, Math.min(99, numberValue(profile?.level))),
  };

  return <CommunityBrowser posts={posts} currentProfile={currentProfile} signedIn />;
}
