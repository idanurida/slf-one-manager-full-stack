# 🧪 Testing Guide - SLF One Manager

## Development Server Status
✅ **Server Running** at `http://localhost:3000`

---

## 📋 Test Cases

### 1. Registration Flow Testing
**Objective:** Verify new user registration with pending approval

#### Steps:
1. Go to `http://localhost:3000/register`
2. **Step 1 - Basic Info:**
   - Full Name: `Test User`
   - Email: `testuser@example.com`
   - Role: `Inspector` (or any role)
   - Specialization: `Architectural` (if inspector selected)
   - Click "Lanjutkan"
   
3. **Step 2 - Password:**
   - Password: `TestPassword123!`
   - Confirm Password: `TestPassword123!`
   - Click "Daftar"

#### Expected Results:
- ✅ Success message appears
- ✅ Message shows: "Cek email... approval dari SuperAdmin"
- ✅ Redirect to login after 3 seconds
- ✅ User created in `profiles` table with:
  - `is_approved: false`
  - `status: 'pending'`
  - `email: testuser@example.com`

---

### 2. Login Flow Testing (Pending Approval)
**Objective:** Verify login gating for unapproved users

#### Steps:
1. Go to `http://localhost:3000/login`
2. Email: `testuser@example.com`
3. Password: `TestPassword123!`
4. Click "Masuk"

#### Expected Results:
- ✅ User cannot login
- ✅ Error message: "Akun Anda masih menunggu approval dari SuperAdmin"
- ✅ Redirect to approval waiting page

---

### 3. Admin Approval Testing
**Objective:** Verify admin can approve users

#### Steps (SuperAdmin Only):
1. Go to `http://localhost:3000/dashboard/superadmin`
2. Navigate to "User Management" or "Approvals"
3. Find `testuser@example.com`
4. Click "Approve"
5. Update database directly (if needed):
   ```sql
   UPDATE profiles 
   SET is_approved = true, status = 'active'
   WHERE email = 'testuser@example.com'
   ```

#### Expected Results:
- ✅ User `is_approved` changes to `true`
- ✅ User can now login

---

### 4. Approved User Login
**Objective:** Verify login works after approval

#### Steps:
1. Go to `http://localhost:3000/login`
2. Email: `testuser@example.com`
3. Password: `TestPassword123!`
4. Click "Masuk"

#### Expected Results:
- ✅ Login successful
- ✅ Redirect to role-based dashboard:
  - `admin_team` → `/dashboard/admin-team`
  - `inspector` → `/dashboard/inspector`
  - `client` → `/dashboard/client`
  - etc.

---

### 5. PostgREST HTTP 400 Errors Check
**Objective:** Verify no more ambiguous nested selects errors

#### Steps:
1. Open DevTools (F12)
2. Go to Network tab
3. Navigate to different dashboard pages:
   - `/dashboard/admin-team`
   - `/dashboard/admin-team/timeline`
   - `/dashboard/admin-team/projects`
   - `/dashboard/inspector/my-inspections`
   - `/dashboard/project-lead/projects`
   - `/dashboard/team-leader/projects`

#### Expected Results:
- ✅ No HTTP 400 responses
- ✅ No `PGRST200` or `PGRST201` errors
- ✅ All project queries return 200
- ✅ Client data loaded correctly

---

### 6. Data Enrichment Testing
**Objective:** Verify batch client fetch works correctly

#### Check Browser Console:
```javascript
// Open DevTools Console
// Navigate to admin-team projects
// Verify clients are loaded via batch fetch (not nested select)
```

#### Expected Results:
- ✅ Projects display with client names
- ✅ No errors in console for ambiguous selects
- ✅ Client data properly enriched

---

## 🚀 Production Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] No console errors
- [ ] No 400/406 errors from PostgREST
- [ ] Registration flow working
- [ ] Login gating working
- [ ] Approval mechanism working

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://xonhwlzojkdjokezpdrp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>
```

### Build & Deploy
```bash
# Build production
yarn build

# Test production build locally
yarn start

# Deploy to production platform
# (Vercel, Railway, AWS, etc.)
```

### Post-Deployment
- [ ] Test registration on production
- [ ] Test login on production
- [ ] Verify approval workflow
- [ ] Monitor error logs
- [ ] Check dashboard performance

---

## 📊 Key Metrics to Monitor

1. **Registration Success Rate**
   - Target: 99%+
   - Monitor failed registrations

2. **Login Success Rate**
   - Target: 99%+
   - Monitor failed login attempts

3. **PostgREST Query Performance**
   - All queries should return < 200ms
   - Monitor for 400/406 errors

4. **User Approval Workflow**
   - Time from registration to approval
   - Approval success rate

---

## 🐛 Troubleshooting

### Issue: Registration fails with "Email already registered"
**Solution:** Email already exists in Supabase Auth
- Use different email or delete the user from Supabase Dashboard

### Issue: Login fails with "Email not confirmed"
**Solution:** Email verification required
- Check email inbox for Supabase verification link
- Or update `email_confirmed_at` in Supabase

### Issue: Still seeing HTTP 400 errors
**Solution:** Clear browser cache and hard refresh (Ctrl+Shift+R)
- Restart dev server
- Check Network tab for exact error

### Issue: Client data not showing
**Solution:** Batch fetch may have failed
- Check browser console for errors
- Verify `clients` table has data
- Check if `client_id` matches

---

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Check Supabase dashboard for data
3. Review this testing guide
4. Check git logs: `git log --oneline`

---

**Last Updated:** 2025-12-10
**Status:** ✅ Ready for Testing & Deployment
