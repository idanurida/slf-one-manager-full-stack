export async function checkSuperAdmin(email) {
  // Hanya superadmin2@slf.com yang dianggap superadmin
  const isSuperAdmin = email === 'superadmin2@slf.com'
  console.log('🔐 Auth check:', email, '-> isSuperAdmin:', isSuperAdmin)
  return isSuperAdmin
}