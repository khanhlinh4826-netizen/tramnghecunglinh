import { getStore } from "@netlify/blobs";
import { json, requireAdmin } from "./_util.mjs";

export default async (req) => {
  const denied = requireAdmin(req);
  if (denied) return denied;

  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const store = getStore("applications");
  const { blobs } = await store.list();
  const apps = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })));
  apps.sort((a, b) => (b?.submittedAtIso || "").localeCompare(a?.submittedAtIso || ""));
  return json(apps.filter(Boolean));
};

export const config = { path: "/.netlify/functions/applications" };
