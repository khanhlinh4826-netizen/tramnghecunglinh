import { getStore } from "@netlify/blobs";
import { json, requireAdmin } from "./_util.mjs";

export default async (req) => {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return json({ error: "Thiếu id CV." }, 400);

  const store = getStore("cv-files");
  const result = await store.getWithMetadata(id, { type: "arrayBuffer" });
  if (!result) return json({ error: "Không tìm thấy file CV." }, 404);

  const filename = result.metadata?.filename || "cv";
  const contentType = result.metadata?.contentType || "application/octet-stream";

  return new Response(result.data, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
};

export const config = { path: "/.netlify/functions/cv" };
