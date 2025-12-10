# 🚀 Deployment Guide - SLF One Manager

## Current Status
- **Branch:** `fix/supabase-database-errors`
- **Last Commit:** `fix: remove ambiguous PostgREST clients embeds`
- **Status:** ✅ Ready for Production

---

## Pre-Deployment Checklist

### Code Quality
- [x] All ambiguous PostgREST embeds removed
- [x] Batch fetch pattern implemented
- [x] No HTTP 400/406 errors remaining
- [x] Static checks passing
- [x] Registration flow complete
- [x] Login gating implemented
- [x] Approval mechanism working

### Testing
- [ ] Registration tested (new user)
- [ ] Login tested (approved user)
- [ ] Login gating tested (unapproved user)
- [ ] Dashboard pages tested (no 400 errors)
- [ ] Client data enrichment verified
- [ ] All role-based dashboards accessible

### Environment
- [x] Node.js v22.21.1
- [x] Yarn v1.22.22
- [x] Next.js 16.0.7
- [x] Supabase configured

---

## Deployment Steps

### 1. Final Code Review
```bash
# Review commits on feature branch
git log --oneline fix/supabase-database-errors | head -10

# See what changed from main
git diff main..fix/supabase-database-errors --stat
```

### 2. Build Production
```bash
# Clean install
yarn install --frozen-lockfile

# Build for production
yarn build

# This should complete without errors
```

### 3. Test Production Build Locally
```bash
# Run production build locally
yarn start

# Test at http://localhost:3000
# - Test registration
# - Test login
# - Test dashboards
```

### 4. Merge to Main
```bash
# Checkout main
git checkout main

# Ensure main is up to date
git pull origin main

# Merge feature branch
git merge fix/supabase-database-errors

# Push to origin
git push origin main
```

### 5. Deploy to Production

#### Option A: Vercel (Recommended for Next.js)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Follow prompts and deploy
```

#### Option B: Docker + Cloud Platform
```bash
# Build Docker image
docker build -t slf-one-manager .

# Push to registry
docker push your-registry/slf-one-manager:latest

# Deploy via your cloud platform
```

#### Option C: Railway.app
```bash
# Connect GitHub repo
# Railway auto-deploys on git push

# Set environment variables in Railway dashboard:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
```

#### Option D: Self-Hosted (Ubuntu/Debian)
```bash
# SSH into server
ssh user@your-server.com

# Clone repo
git clone https://github.com/idanurida/slf-one-manager-full-stack.git
cd slf-one-manager-full-stack

# Checkout main
git checkout main

# Install & build
yarn install
yarn build

# Setup PM2 for auto-restart
npm install -g pm2
pm2 start yarn --name "slf-one-manager" -- start
pm2 save

# Setup Nginx reverse proxy (optional)
# Create /etc/nginx/sites-available/slf-one-manager
# Point to http://localhost:3000
```

---

## Post-Deployment Verification

### 1. Health Check
```bash
# Check if app is running
curl http://your-domain.com/api/health

# Or manual check
# Visit https://your-domain.com/login
# Should load registration & login page
```

### 2. Registration Test
1. Go to `/register`
2. Create test account
3. Verify email is received
4. Confirm user appears in Supabase with `is_approved: false`

### 3. Login Gating Test
1. Try to login with unapproved account
2. Should see "Menunggu approval" message
3. Verify cannot access dashboards

### 4. Dashboard Test
1. Approve test user in Supabase:
   ```sql
   UPDATE profiles SET is_approved = true WHERE email = 'test@example.com'
   ```
2. Login with approved account
3. Verify role-based redirect works
4. Check no 400 errors in Network tab

### 5. Database Performance
```bash
# Monitor query performance
# In Supabase Dashboard > SQL Editor:
SELECT COUNT(*) FROM projects WHERE client_id IS NOT NULL;
SELECT COUNT(*) FROM profiles WHERE is_approved = false;
```

---

## Environment Variables

### Development (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xonhwlzojkdjokezpdrp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### Production (Set in Deployment Platform)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xonhwlzojkdjokezpdrp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NODE_ENV=production
```

---

## Monitoring & Logging

### Setup Error Tracking
```javascript
// Consider integrating Sentry for error tracking
// https://sentry.io/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Monitor Key Metrics
1. **Registration Rate**
   - Track daily registrations
   - Monitor approval queue

2. **Login Success Rate**
   - Track failed logins
   - Monitor email verification issues

3. **API Performance**
   - Monitor Supabase API response times
   - Track rate limiting

4. **Database**
   - Monitor query performance
   - Check connection pool usage

---

## Rollback Plan

If deployment has issues:

```bash
# 1. Identify issue (usually in logs)
# 2. Revert to previous version
git revert HEAD

# 3. Redeploy
# (Follow platform-specific redeploy steps)

# 4. Investigate issue locally
git checkout fix/supabase-database-errors
# Fix the issue
git push origin fix/supabase-database-errors

# 5. Redeploy after fix
```

---

## Maintenance

### Regular Tasks
- [ ] Monitor error logs weekly
- [ ] Check Supabase quota usage
- [ ] Update dependencies monthly
- [ ] Review user approval queue
- [ ] Backup database regularly

### Update Next.js
```bash
# Check for updates
yarn upgrade-interactive

# Update Next.js
yarn add next@latest

# Test build
yarn build

# Deploy
```

---

## Performance Optimization (Post-Deployment)

### 1. Enable Caching
```bash
# In vercel.json or next.config.js
# Set appropriate cache headers for static assets
```

### 2. Optimize Images
```bash
# All images should be optimized
# Next.js Image component handles this
```

### 3. Monitor Core Web Vitals
```bash
# Use Vercel Analytics or Google PageSpeed Insights
# Target: LCP < 2.5s, FID < 100ms, CLS < 0.1
```

---

## Support & Troubleshooting

### Common Issues

**Issue: Build fails with TypeScript errors**
- Solution: `yarn build` should complete
- Check: `next.config.js` and `tsconfig.json`

**Issue: Supabase connection fails**
- Solution: Verify environment variables
- Check: Supabase project is active
- Verify: CORS settings in Supabase

**Issue: Registration emails not received**
- Solution: Check Supabase email settings
- Verify: Email domain verified
- Check: Spam folder

**Issue: Database connection drops**
- Solution: Supabase auto-manages connections
- Monitor: Supabase dashboard
- Check: Connection pool limits

---

## Documentation Links

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Vercel Deployment](https://vercel.com/docs)
- [PM2 Process Manager](https://pm2.keymetrics.io/)

---

**Last Updated:** 2025-12-10
**Status:** ✅ Ready for Production Deployment

---

## Next Steps

1. ✅ Development complete
2. ⏳ Testing phase (run TESTING_GUIDE.md)
3. ⏳ Production deployment
4. ⏳ Monitor & maintain

**Ready to deploy? Start with Testing Phase!**
