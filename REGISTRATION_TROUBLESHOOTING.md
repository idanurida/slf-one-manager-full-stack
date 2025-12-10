# 📋 Registration & Email Confirmation Troubleshooting Guide

**Last Updated:** December 10, 2025  
**Status:** Updated with fixes for email confirmation, notification timing, role assignment, and approval UI

---

## 🎯 Complete Registration Flow

### Step 1: Register New Account
1. Go to `/register`
2. **Step 1 Form:**
   - Full Name
   - Email
   - Role (Client, Inspector, Project Lead, etc.)
   - If Inspector → Select Specialization (Architectural, Structural, or MEP)
   - Phone (optional)
   - Company (optional)
3. **Step 2 Form:**
   - Password (min 8 characters)
   - Confirm Password
   - Click "Daftar Sekarang" (Register Now)

### Step 2: Success Message (5 seconds)
- ✅ Success alert appears with detailed instructions
- Message shows 3 steps clearly:
  - 📧 **Step 1:** Check email and click confirmation link
  - 👨‍💼 **Step 2:** Wait for SuperAdmin approval
  - ✅ **Step 3:** Login once approved
- **Timeout:** 5 seconds (extended from 3s) → Auto-redirect to login
- **💡 TIP:** Message now suggests checking spam folder

### Step 3: Email Confirmation
**What Happens Behind the Scenes:**
- Supabase sends confirmation email to user's email address
- Email contains link to confirm email address
- Link redirects user to `/login` after confirmation
- Database flag: `email_confirmed_at` is set when user clicks link

**Common Issue:** User clicks email link and gets "unable to connect" error
- **Solution 1:** Check browser console for redirect URL error
- **Solution 2:** Manually navigate to `/login` after confirmation
- **Solution 3:** Verify Supabase email configuration in project settings

**Check Email Confirmation Status:**
- Go to **SuperAdmin Dashboard** → **Users**
- Look for badge under user's "Status" column
- Should show: "📧 Email Not Verified" or "📧 Email Verified" (blue badge)

### Step 4: SuperAdmin Approval
**Where:**
- Dashboard → SuperAdmin → Manage Users
- Filter by "Status" = "Pending"

**What to Look For:**
- User appears in list with status badge: "Pending Approval"
- Email verification status shown (red = not verified, blue = verified)

**Approval Actions:**
- ✅ **Green button with checkmark (UserCheck icon)** = Approve user
- ❌ **Red button with X (UserX icon)** = Reject user

**After Approval:**
- User's `is_approved` field becomes `true`
- User receives email notification (if configured)
- Next login will redirect to user's role dashboard

### Step 5: Login & Dashboard Redirect
**After approval:**
- Go to `/login`
- Enter email & password
- **Auto-redirect based on role:**
  - `client` → `/dashboard/client`
  - `inspector` → `/dashboard/inspector`
  - `project_lead` → `/dashboard/project-lead`
  - `head_consultant` → `/dashboard/head-consultant`
  - `admin_lead` → `/dashboard/admin-lead`
  - `admin_team` → `/dashboard/admin-team`
  - `superadmin` → `/dashboard/superadmin`
  - `drafter` → `/dashboard/drafter`

---

## 🔴 Common Issues & Fixes

### Issue 1: Email Confirmation Redirect "Unable to Connect"
**Problem:** User clicks email link and gets redirect error page  
**Root Cause:** Callback URL misconfiguration in Supabase or network issue

**Troubleshooting:**
1. Check **Supabase Project Settings** → **Auth** → **URL Configuration**
2. Verify **Redirect URLs** include: `http://localhost:3000/login` (dev) or `https://yourdomain.com/login` (prod)
3. Check browser console for actual redirect URL being attempted
4. Try clicking link again after 30 seconds
5. Copy email confirmation URL and manually navigate to it
6. Last resort: Manually set `email_confirmed_at` in Supabase database

**Code Fix Applied:**
- `src/utils/auth.js` now includes proper email redirect handling:
  ```javascript
  emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined
  ```

---

### Issue 2: Success Notification Disappears Too Quickly
**Problem:** Registration success message vanishes before user can read it

**Root Cause:** 3-second redirect timeout was too aggressive

**Fix Applied:**
- ✅ **Timeout extended from 3 seconds to 5 seconds**
- User has 5 seconds to read the success message and check email
- Toast now shows detailed 3-step instructions

**Where Fixed:**
- `src/pages/register.js` line ~145

---

### Issue 3: Approval Buttons Hidden for Pending Users
**Problem:** Approve/Reject buttons don't appear in SuperAdmin users page for pending users

**Root Cause:** Conditional rendering based on `status === 'pending'` or `!is_approved`

**Status Logic:**
```javascript
// Shows buttons ONLY if:
(profile.status === 'pending' || (!profile.is_approved && !profile.status))
```

**Debugging:**
1. Open browser DevTools → Elements
2. Inspect user row in table
3. Check if buttons div is present in HTML
4. If present but hidden: Check CSS display property
5. Check user's `is_approved` and `status` fields in database

**Manual Check in Supabase:**
- Go to **Supabase Dashboard** → **SQL Editor**
- Run: `SELECT id, email, is_approved, status FROM profiles WHERE email = 'user@example.com';`
- Expected: `is_approved = false, status = 'pending'`

---

### Issue 4: Inspector Registers as Client
**Problem:** User selects "Inspector" role but redirects to `/dashboard/client` after approval

**Root Cause:** Role not saved correctly in `profiles` table during registration

**Debugging Steps:**
1. **Check registration logs:**
   - Open browser Console (F12)
   - During registration, look for: `[Register] Signing up with role: inspector`
   - Look for: `[Auth] User data: { role: 'inspector', ... }`

2. **Check Supabase profiles table:**
   - Go to **Supabase** → **SQL Editor**
   - Run: `SELECT id, email, role, is_approved FROM profiles WHERE email = 'inspector@example.com';`
   - Verify role = `'inspector'` (not `'client'`)

3. **Check AuthContext role detection:**
   - After login, check browser Console
   - Look for: `[AuthContext] RAW Role: inspector | Normalized Role: inspector`

4. **Force role reload:**
   - Try logging out and in again
   - Try clearing localStorage: Open Console and run:
     ```javascript
     localStorage.removeItem('auth_profile_cache_v2');
     window.location.reload();
     ```

**Fix Applied:**
- Added role logging in `src/utils/auth.js`:
  ```javascript
  console.log('[Auth] Creating profile with role:', profileData.role);
  console.log('[Auth] ✅ Profile created successfully with role:', userData.role);
  ```
- Now throws error if profile creation fails (instead of silently continuing)

---

### Issue 5: User Can't Login After Email Confirmation
**Problem:** After confirming email, user still can't login (says "Email not confirmed")

**Root Cause:** Database not updated with confirmation or Supabase auth state mismatch

**Fix Steps:**
1. **Check email_confirmed_at in database:**
   ```sql
   SELECT email, email_confirmed_at FROM profiles 
   WHERE email = 'user@example.com';
   ```
   - If NULL, email confirmation didn't work

2. **Manually confirm email in Supabase:**
   - Go to **Supabase Auth Users** page
   - Find user
   - Check "User Details" → "Email Confirmed" toggle
   - Should be enabled (blue)

3. **If Supabase Auth says confirmed but profiles table doesn't:**
   - Update profiles manually:
     ```sql
     UPDATE profiles 
     SET email_confirmed_at = NOW() 
     WHERE email = 'user@example.com';
     ```

---

### Issue 6: "Gagal membuat profil" (Profile Creation Failed) Error
**Problem:** Registration fails with "Gagal membuat profil" message

**Root Cause:** Database constraints or RLS policy blocking profile creation

**Debugging:**
1. Check browser Console for detailed error message
2. Verify Supabase RLS policies allow INSERT on profiles table
3. Check if profile with same ID already exists:
   ```sql
   SELECT * FROM profiles WHERE id = 'user-uuid-here';
   ```

**Fix Applied:**
- `src/utils/auth.js` now throws descriptive error:
  ```javascript
  throw new Error(`Gagal membuat profil: ${profileError.message}`);
  ```

---

## 🔧 Database Queries for Troubleshooting

### Check User Registration Status
```sql
SELECT 
  id,
  email,
  full_name,
  role,
  status,
  is_approved,
  email_confirmed_at,
  created_at
FROM profiles 
WHERE email = 'user@example.com'
ORDER BY created_at DESC
LIMIT 5;
```

### Check Pending Users (Not Approved)
```sql
SELECT 
  email,
  full_name,
  role,
  status,
  email_confirmed_at,
  created_at
FROM profiles 
WHERE is_approved = false
ORDER BY created_at DESC;
```

### Check Email Verification Status
```sql
SELECT 
  email,
  role,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN 'Verified'
    ELSE 'Not Verified'
  END as verification_status
FROM profiles;
```

### Manually Approve a User
```sql
UPDATE profiles 
SET is_approved = true, status = 'approved'
WHERE email = 'user@example.com';
```

### Manually Confirm Email
```sql
UPDATE profiles 
SET email_confirmed_at = NOW()
WHERE email = 'user@example.com';
```

---

## 📊 Monitoring Metrics

### Key Metrics to Track
- **Registration attempts vs. completions** (success rate)
- **Email confirmation rate** (% who click email link)
- **Approval rate** (% of pending users who get approved)
- **Role distribution** (% per role)
- **Time from registration to first login** (user engagement)

### Recommended Monitoring
1. **Database Logs:**
   - Check Supabase "Logs" tab for INSERT/UPDATE errors
   - Search for "profiles" table operations

2. **Application Logs:**
   - Check browser Console during registration
   - Look for `[Register]` and `[Auth]` log messages
   - Export logs for analysis

3. **Email Delivery:**
   - Check if Supabase is configured to send emails
   - Monitor email delivery reports in Supabase dashboard
   - Test email by completing registration yourself

---

## ✅ Testing Checklist

### Test 1: Complete Registration Flow - Client Role
- [ ] Navigate to `/register`
- [ ] Fill in Step 1: Full Name, Email, Role (Client)
- [ ] Fill in Step 2: Password, Confirm Password
- [ ] Click "Daftar Sekarang"
- [ ] See success message with 3-step instructions (should display 5 seconds)
- [ ] Check email for confirmation link
- [ ] Click confirmation link in email
- [ ] Check Supabase: `email_confirmed_at` is set
- [ ] Go to SuperAdmin → Users
- [ ] Find user in Pending list with status badge
- [ ] Click green Approve button
- [ ] Verify `is_approved` becomes true
- [ ] Go to `/login`
- [ ] Login with email & password
- [ ] Should redirect to `/dashboard/client`

### Test 2: Inspector Registration with Specialization
- [ ] Navigate to `/register`
- [ ] Fill in Step 1: Full Name, Email, Role (Inspector)
- [ ] Select Specialization (e.g., Architectural)
- [ ] Fill in Step 2: Password
- [ ] Click "Daftar Sekarang"
- [ ] Confirm email (click link in email)
- [ ] Go to SuperAdmin → Users
- [ ] Approve user
- [ ] Login
- [ ] **Should redirect to `/dashboard/inspector` (NOT `/dashboard/client`)**
- [ ] Verify `role = 'inspector'` in database

### Test 3: Email Redirect Handling
- [ ] Complete registration
- [ ] Click email confirmation link
- [ ] If redirect fails:
  - [ ] Check browser Console for error URL
  - [ ] Manually navigate to `/login`
  - [ ] Verify you can login successfully

### Test 4: Role-Based Redirects (After Approval)
- [ ] Register multiple test users with different roles
- [ ] Approve each one
- [ ] Login as each role and verify dashboard:
  - [ ] Client → `/dashboard/client`
  - [ ] Inspector → `/dashboard/inspector`
  - [ ] Project Lead → `/dashboard/project-lead`
  - [ ] Head Consultant → `/dashboard/head-consultant`
  - [ ] Admin Lead → `/dashboard/admin-lead`
  - [ ] Admin Team → `/dashboard/admin-team`
  - [ ] Superadmin → `/dashboard/superadmin`

### Test 5: Approval Buttons Visibility
- [ ] Register new user
- [ ] Go to SuperAdmin → Users
- [ ] Search for new user
- [ ] Verify status shows "Pending Approval" badge
- [ ] Verify email verification status badge appears
- [ ] **Verify Approve (✓) and Reject (✗) buttons are visible**
- [ ] Test Approve button works
- [ ] Test Reject button works

---

## 🚀 Production Deployment Notes

### Before Going to Production
1. **Email Configuration:**
   - Verify Supabase email provider is configured
   - Test email delivery (send test email)
   - Verify sender email address is correct

2. **URL Configuration:**
   - Update `emailRedirectTo` to use production domain
   - Verify Supabase Auth Redirect URLs include production domain

3. **Database:**
   - Verify all RLS policies allow necessary operations
   - Test registration with production database
   - Backup database before deploying

4. **Role Configuration:**
   - Verify all roles are listed in `AVAILABLE_ROLES`
   - Test registration for each role
   - Verify redirects work for each role

### Monitoring in Production
- Monitor email delivery in Supabase dashboard
- Track registration completion rate
- Monitor approval queue in SuperAdmin
- Set up alerts for failed profile creation

---

## 📞 Support

If issues persist:
1. Check browser Console (F12) for detailed error messages
2. Review **Supabase Logs** for database/auth errors
3. Run SQL queries above to verify data
4. Check this guide for your specific issue
5. Contact development team with:
   - Screenshots of error
   - Browser Console logs
   - User email address
   - Steps to reproduce
