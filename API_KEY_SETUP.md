# 🔐 API Key Management Guide - Nielcare Dental

## ⚠️ IMPORTANT: Security Best Practices

### 1. **Environment Variables**
- **NEVER commit `.env.local`** to Git
- **NEVER hardcode** API keys in source files
- **ALWAYS use `.env.local`** for local development
- **ALWAYS use `.env.example`** to document required variables

### 2. **Current Configuration Files**

#### `.env.local` (NEVER commit this!)
```
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
GEMINI_API_KEY=xxx
NEXTAUTH_SECRET=xxx
```

#### `.env.example` (Safe to commit)
```
Template showing which env vars are needed
No actual secrets included
```

#### `.gitignore` Status: ✅ CORRECT
- `.env*` pattern is configured
- All `.env` files are ignored

---

## 🔴 Issues Fixed

### ✅ FIXED: Hardcoded API Keys
- **Removed from**: `test-gemini.js`
- **Now uses**: `process.env.GEMINI_API_KEY`
- **Fallback**: Proper error message if env var missing

### ✅ FIXED: Supabase Key in Fallback
- **Removed from**: `scratch.js`
- **Now validates**: Environment variables before use
- **Error handling**: Clear error messages for missing config

### ✅ FIXED: Non-null Assertions
- **Updated**: `app/api/auth/register/route.ts`
- **Before**: `process.env.KEY!` (unsafe)
- **After**: Proper validation with error handling

### ✅ IMPROVED: Gemini API Error Handling
- **Added**: Detailed error logging
- **Added**: Debug info in development mode
- **Improved**: Error messages

---

## 📋 Setup Instructions

### Step 1: Get API Keys

#### Supabase
1. Go to https://supabase.com
2. Create/login to your project
3. Get credentials from Settings → API
4. Copy `URL` and `Anon Key` (public) → `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Copy `Service Role Key` (secret) → `SUPABASE_SERVICE_ROLE_KEY`

#### Google Gemini
1. Go to https://ai.google.dev/
2. Click "Get API key"
3. Create new API key
4. Copy key → `GEMINI_API_KEY`
5. ⚠️ **DON'T** share this key with anyone

### Step 2: Configure Local Environment
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and fill in your actual API keys:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-url.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   GEMINI_API_KEY=your-gemini-key
   NEXTAUTH_SECRET=your-secret
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **VERIFY**: Make sure `.env.local` is in `.gitignore` ✅

### Step 3: Verify Configuration
Run this to test:
```bash
npm run dev
```

Check for these error messages (should NOT appear):
- "GEMINI_API_KEY is not set"
- "NEXT_PUBLIC_SUPABASE_URL is not set"
- "SUPABASE_SERVICE_ROLE_KEY is not set"

---

## 🚨 If Keys Are Compromised

### IMMEDIATELY DO THIS:

1. **Revoke Old Keys**
   - Supabase: Go to Settings → API → Regenerate keys
   - Gemini: Go to https://console.cloud.google.com → API Keys → Delete key

2. **Create New Keys**
   - Generate new keys from services
   - Update `.env.local` with new keys

3. **Verify Git History**
   ```bash
   git log --all --oneline -- "*.ts" "*.js" | grep -i "key\|secret"
   git log -p -- .env.local  # Check if ever committed
   ```

4. **Contact Providers**
   - Inform Supabase & Google of potential compromise

---

## ✅ Files Status

### 🟢 SAFE
- `.env.local` - In .gitignore ✅
- `.gitignore` - Configured correctly ✅

### 🟡 NEEDS ATTENTION
- `test-gemini.js` - **FIXED** ✅ (now uses env vars)
- `scratch.js` - **FIXED** ✅ (removed hardcoded key)
- `app/api/auth/register/route.ts` - **FIXED** ✅ (proper validation)
- `app/api/ai/analyze-symptoms/route.ts` - **IMPROVED** ✅ (better error handling)

### 🟢 ALREADY GOOD
- `lib/supabase/client.ts` - Has proper fallback
- `lib/supabase/server.ts` - Has proper fallback
- `lib/supabase/middleware.ts` - Checks env vars

---

## 🔍 How to Debug API Key Issues

If you get errors, check these:

### 1. Test Supabase Connection
```javascript
// In browser console on any page
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(
  'YOUR_URL',
  'YOUR_ANON_KEY'
);
console.log(supabase);  // Should not be placeholder
```

### 2. Check .env.local
```bash
# Make sure file exists
cat .env.local

# Check Gemini API key specifically
grep "GEMINI_API_KEY" .env.local
```

### 3. Test Gemini API
```bash
# Create test file (don't commit this!)
node -e "
const key = process.env.GEMINI_API_KEY;
if (!key) console.error('GEMINI_API_KEY not set');
else console.log('Key found:', key.substring(0, 10) + '...');
"
```

### 4. Check Server Logs
```bash
npm run dev
# Look for errors like:
# "CRITICAL: GEMINI_API_KEY environment variable is not set"
```

---

## 📚 References

- [Next.js Environment Variables](https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables)
- [Supabase Documentation](https://supabase.com/docs)
- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Security Best Practices](https://owasp.org/www-project-api-security/)

---

## ✨ Summary

| Issue | Status | Fix |
|-------|--------|-----|
| Hardcoded keys in JS | 🔴 FOUND | ✅ REMOVED |
| Non-null assertions | 🔴 FOUND | ✅ FIXED |
| Error handling | 🟡 WEAK | ✅ IMPROVED |
| Documentation | 🔴 MISSING | ✅ ADDED |

**All critical security issues have been addressed!**
