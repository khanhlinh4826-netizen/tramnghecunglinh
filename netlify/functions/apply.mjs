import { getStore } from "@netlify/blobs";
import { json } from "./_util.mjs";

const CV_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function nowVN() {
  return new Date().toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let form;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Không đọc được dữ liệu form." }, 400);
  }

  // Honeypot: nếu bot điền vào trường ẩn này, âm thầm coi như thành công để không lộ cơ chế chặn
  if ((form.get("bot-field") || "").toString().trim() !== "") {
    return json({ ok: true });
  }

  const name = (form.get("Họ tên") || "").toString().trim();
  const email = (form.get("email") || "").toString().trim();
  const phone = (form.get("Số điện thoại") || "").toString().trim();
  const position = (form.get("Vị trí ứng tuyển") || "").toString().trim();
  const jobId = (form.get("jobId") || "").toString().trim() || null;
  const message = (form.get("Lời nhắn") || "").toString().trim();
  const file = form.get("attachment");

  if (!name || !email || !phone) {
    return json({ error: "Thiếu Họ tên, Email hoặc Số điện thoại." }, 400);
  }
  if (!(file instanceof File) || file.size === 0) {
    return json({ error: "Thiếu file CV." }, 400);
  }
  if (file.size > CV_MAX_BYTES) {
    return json({ error: "File CV vượt quá 5MB." }, 413);
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return json({ error: "Định dạng file không hợp lệ. Chỉ nhận PDF/DOC/DOCX." }, 400);
  }

  const id = "app-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);

  const cvStore = getStore("cv-files");
  const buf = await file.arrayBuffer();
  await cvStore.set(id, buf, {
    metadata: { filename: file.name || "cv", contentType: file.type || "application/octet-stream" },
  });

  const appsStore = getStore("applications");
  const record = {
    id,
    name,
    email,
    phone,
    position,
    jobId,
    message,
    status: "New",
    submittedAt: nowVN(),
    submittedAtIso: new Date().toISOString(),
    cvFileId: id,
    cvFileName: file.name || "cv",
  };
  await appsStore.setJSON(id, record);

  return json({ ok: true });
};

export const config = { path: "/.netlify/functions/apply" };
