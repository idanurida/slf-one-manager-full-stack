// FILE: src/pages/api/admin/users.js
export default function handler(req, res) {
  console.log("✅ Admin API called");
  return res.status(200).json({
    success: true,
    message: "Admin API is working",
    timestamp: new Date().toISOString(),
    path: "/api/admin/users"
  });
}