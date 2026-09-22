// Hàm dùng chung cho các Netlify Functions.

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

// Kiểm tra quyền admin: header "x-admin-key" phải khớp biến môi trường ADMIN_KEY.
// ADMIN_KEY được đặt trong Netlify (Site settings → Environment variables) — KHÔNG bao giờ
// nằm trong code hay HTML, nên không bị lộ khi ai đó xem mã nguồn trang.
export function isAdmin(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return false; // chưa cấu hình ADMIN_KEY -> khoá toàn bộ chức năng admin
  const provided = req.headers.get("x-admin-key") || "";
  return provided === key;
}

export function requireAdmin(req) {
  if (!isAdmin(req)) {
    return json({ error: "Sai mã truy cập hoặc chưa có quyền admin." }, 401);
  }
  return null;
}
