# ⚡ Quick Start Guide - SLF One Manager

## 🎯 Current Status
- ✅ Development server running at `http://localhost:3000`
- ✅ All dependencies installed
- ✅ Supabase configured
- ✅ Registration system ready
- ✅ No PostgREST 400 errors

---

## 🔧 Development Setup (Already Done)

```bash
# Dependencies installed with yarn
yarn install

# Dev server running
yarn dev

# Access at: http://localhost:3000
```

---

## 🧪 Testing Phase

### Test Case 1: Register New User
1. Go to `http://localhost:3000/register`
2. Fill in details:
   - Name: `John Doe`
   - Email: `john@example.com`
   - Role: `Inspector`
   - Specialization: `Structural`
   - Password: `Test@1234`
3. Submit
4. See success message with approval info

**Expected:** User created with `is_approved: false`

### Test Case 2: Try Login (Should Fail)
1. Go to `http://localhost:3000/login`
2. Email: `john@example.com`
3. Password: `Test@1234`
4. Should see: "Akun Anda masih menunggu approval"

**Expected:** Login blocked, approval message shown

### Test Case 3: Admin Approves User
Go to Supabase Dashboard:
```sql
-- Update this user in profiles table
UPDATE profiles 
SET is_approved = true, status = 'active'
WHERE email = 'john@example.com';
```

### Test Case 4: Login After Approval
1. Go to `http://localhost:3000/login`
2. Email: `john@example.com`
3. Password: `Test@1234`
4. Should redirect to `/dashboard/inspector`

**Expected:** Login successful, redirect to role dashboard

### Test Case 5: Check No PostgREST Errors
1. Open DevTools (F12)
2. Go to Network tab
3. Navigate between dashboard pages
4. Check for HTTP 400 errors

**Expected:** No 400 errors, all queries return 200

---

## 📋 Development Features

### Ready to Code
- [x] User authentication
- [x] Role-based dashboard
- [x] Profile management
- [x] Client data fetch (batch pattern)
- [x] PostgREST optimized queries

### Add New Features
When adding new features:

#### For Data Fetching:
```javascript
// ✅ GOOD - Batch fetch pattern
const { data: projects } = await supabase
  .from('projects')
  .select('*')
  .eq('user_id', userId);

// Batch fetch clients
const clientIds = [...new Set(projects.map(p => p.client_id))];
const { data: clients } = await supabase
  .from('clients')
  .select('id, name')
  .in('id', clientIds);

// Enrich projects with client data
const enriched = projects.map(p => ({
  ...p,
  client: clients.find(c => c.id === p.client_id)
}));
```

#### Avoid:
```javascript
// ❌ BAD - Ambiguous nested select
const { data: projects } = await supabase
  .from('projects')
  .select('*, clients!client_id(name)'); // This causes 400 errors
```

---

## 🚀 Ready for Production

### Build for Production
```bash
yarn build
```

### Test Production Build
```bash
yarn start
# Visit http://localhost:3000
```

### Deploy Options
1. **Vercel** (Easiest for Next.js)
   ```bash
   yarn global add vercel
   vercel --prod
   ```

2. **Docker**
   ```bash
   docker build -t slf-one-manager .
   docker run -p 3000:3000 slf-one-manager
   ```

3. **Railway.app** (Git-based auto-deploy)
   - Connect GitHub repo
   - Set env vars
   - Auto-deploys on git push

4. **Self-hosted** (Ubuntu/Debian)
   ```bash
   # See DEPLOYMENT_GUIDE.md for detailed steps
   ```

---

## 📁 Project Structure

```
src/
├── pages/
│   ├── register.js          # Registration form
│   ├── login.js             # Login form
│   ├── dashboard/           # Role-based dashboards
│   └── api/                 # Backend routes
├── components/
│   ├── ui/                  # shadcn/ui components
│   └── [feature]/           # Feature components
├── utils/
│   ├── auth.js              # Auth functions (signUp, signIn, signOut)
│   ├── supabaseClient.js    # Supabase config
│   └── supabaseQueries.js   # Safe query helpers
└── context/
    └── AuthContext/         # Auth state management
```

---

## 🔑 Key Features Implemented

### 1. Registration with Approval
- User registers → created with `is_approved: false`
- SuperAdmin approves → set `is_approved: true`
- User can only login after approval

### 2. Role-Based Access Control
Each role has its own dashboard:
- `admin_team` → Admin Team dashboard
- `admin_lead` → Admin Lead dashboard
- `inspector` → Inspector dashboard
- `project_lead` → Project Lead dashboard
- `client` → Client dashboard
- `superadmin` → SuperAdmin dashboard

### 3. Optimized Database Queries
All queries now use batch fetch pattern:
- No ambiguous nested selects
- No HTTP 400 errors
- Fast response times

### 4. Email Verification
- Supabase handles email verification
- Users must click email link before login
- Approval happens separately (by admin)

---

## 📞 Support & Help

### Check Logs
```bash
# Browser console
F12 → Console tab

# Terminal
# Watch for errors in dev server output
```

### Common Issues

**❌ Issue:** Can't register
- ✅ Check email format
- ✅ Check password (min 8 chars)
- ✅ Check Supabase is accessible

**❌ Issue:** Can't login after registration
- ✅ Click email confirmation link first
- ✅ Wait for admin approval
- ✅ Check `is_approved` in database

**❌ Issue:** Seeing HTTP 400 errors
- ✅ Hard refresh (Ctrl+Shift+R)
- ✅ Restart dev server
- ✅ Check DevTools Network tab

**❌ Issue:** Dashboard not loading
- ✅ Check role in profiles table
- ✅ Check user has correct role
- ✅ Check email is verified

---

## 📚 Documentation Files

- **TESTING_GUIDE.md** - Complete testing checklist
- **DEPLOYMENT_GUIDE.md** - Production deployment steps
- **README.md** (original) - Project overview

---

## ✅ Checklist Before Production

- [ ] All tests passing
- [ ] No console errors
- [ ] No 400 errors in Network tab
- [ ] Registration → Approval → Login flow works
- [ ] All dashboards load without errors
- [ ] Build succeeds: `yarn build`
- [ ] Start succeeds: `yarn start`
- [ ] Documentation reviewed
- [ ] Environment variables set correctly

---

## 🎉 You're Ready!

**Next Steps:**
1. ✅ Test registration (use TESTING_GUIDE.md)
2. ⏳ Test login & approval flow
3. ⏳ Deploy to production (use DEPLOYMENT_GUIDE.md)
4. ⏳ Monitor & maintain

**Questions?** Check the guides or review the code!

---

**Last Updated:** 2025-12-10
**Status:** ✅ Ready for Testing & Deployment
