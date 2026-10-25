/**
 * Bangumi (bgm.tv) collections, fetched ONCE at build time. Output is fully
 * static: the composed page embeds the rendered list — visitors make zero
 * third-party requests for data. Cover images hotlink lain.bgm.tv with
 * referrerPolicy="no-referrer" (documented in SITE_ONBOARDING.md); fetching
 * covers into the output would redistribute upstream artwork.
 */
const SUBJECT_TYPES = { anime: 2, book: 1, music: 3, game: 4 };
const UA = "alnilam-static-build (https://github.com/Skyline-Gazer/ALNILAM)";

export async function fetchBangumiCollections({ userId, subjectType = "anime", limit = 10 }) {
  const type = SUBJECT_TYPES[subjectType] ?? 2;
  const url = `https://api.bgm.tv/v0/users/${encodeURIComponent(userId)}/collections?type=${type}&limit=${limit}&offset=0`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`Bangumi API ${res.status} for user ${userId}`);
  const body = await res.json();
  return (body.data ?? []).map((entry) => ({
    name: entry.subject?.name ?? "",
    nameCn: entry.subject?.name_cn || entry.subject?.name || "",
    cover: entry.subject?.images?.common ?? entry.subject?.images?.large ?? "",
    href: entry.subject?.id ? `https://bgm.tv/subject/${entry.subject.id}` : "",
    summary: (entry.subject?.short_summary ?? "").slice(0, 140),
    comment: entry.comment ?? "",
    updatedAt: entry.updated_at ?? "",
  }));
}
