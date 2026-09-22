import { getStore } from "@netlify/blobs";
import seedJobs from "../../data/seed-jobs.json" with { type: "json" };
import { json, requireAdmin } from "./_util.mjs";

function todayVN() {
  return new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

async function getAllJobs(store) {
  const { blobs } = await store.list();
  if (blobs.length === 0) {
    // Lần đầu tiên chạy: nạp sẵn danh sách tin tuyển dụng hiện có (đã gộp sẵn vào code lúc build,
    // không đọc file rời lúc chạy, để tránh lỗi đường dẫn trên môi trường serverless).
    for (const job of seedJobs) {
      await store.setJSON(job.id, job);
    }
    return seedJobs;
  }
  const jobs = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })));
  // Mới nhất lên trước, theo thời điểm lưu (id không có ngày thì giữ nguyên thứ tự lưu)
  return jobs.filter(Boolean).reverse();
}

export default async (req) => {
  const store = getStore("jobs");

  if (req.method === "GET") {
    try {
      const jobs = await getAllJobs(store);
      return json(jobs);
    } catch (err) {
      return json({ error: "Lỗi khi tải danh sách tin: " + err.message }, 500);
    }
  }

  // Mọi thao tác ghi (đăng tin mới / đóng-mở tin / xoá tin) đều cần quyền admin
  const denied = requireAdmin(req);
  if (denied) return denied;

  if (req.method === "POST") {
    const body = await req.json();
    if (!body.title || !body.company || !body.location || !body.industry) {
      return json({ error: "Thiếu thông tin bắt buộc." }, 400);
    }
    const job = {
      id: "job-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
      title: body.title,
      company: body.company,
      location: body.location,
      industry: body.industry,
      salary: body.salary || "Thoả thuận",
      experience: body.experience || "Không yêu cầu",
      type: body.type || "Toàn thời gian",
      postedDate: todayVN(),
      status: "open",
      lang: "vi",
      description: Array.isArray(body.description) ? body.description : [],
      requirements: Array.isArray(body.requirements) ? body.requirements : [],
      benefits: Array.isArray(body.benefits) ? body.benefits : [],
      company_desc: body.company_desc || "",
    };
    await store.setJSON(job.id, job);
    return json(job, 201);
  }

  if (req.method === "PATCH") {
    const body = await req.json();
    if (!body.id) return json({ error: "Thiếu id tin tuyển dụng." }, 400);
    const existing = await store.get(body.id, { type: "json" });
    if (!existing) return json({ error: "Không tìm thấy tin tuyển dụng." }, 404);
    const updated = { ...existing, ...body };
    await store.setJSON(body.id, updated);
    return json(updated);
  }

  if (req.method === "DELETE") {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return json({ error: "Thiếu id tin tuyển dụng." }, 400);
    await store.delete(id);
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config = { path: "/.netlify/functions/jobs" };
