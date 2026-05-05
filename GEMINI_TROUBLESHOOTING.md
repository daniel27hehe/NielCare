# 🤖 Gemini AI Integration - Troubleshooting Guide

## ✅ What Was Fixed

| Issue | Cause | Solution |
|-------|-------|----------|
| "AI Analysis encountered an error or timed out" | Wrong API model/version + configuration | ✅ Updated to `gemini-1.5-flash` + `v1beta` |
| Invalid JSON field | Used `response_mime_type` in v1 API | ✅ Changed to `responseMimeType` in v1beta |
| Model not found | `gemini-pro` not available in v1 | ✅ Using `gemini-1.5-flash` which is available |
| Timeout issues | Timeout too short (15s) | ✅ Increased to 30 seconds |

---

## 🧪 How to Test Gemini API Setup

### Quick Test
```bash
node test-gemini-api.js
```

**Expected output:**
```
✅ SUCCESS! Gemini API is working.
Response: {"result":"test successful"}
🎉 Your API configuration is correct!
```

### If Test Fails

| Error | Solution |
|-------|----------|
| `API Key found` but then `❌ ERROR` | API key may be invalid/revoked - regenerate at https://ai.google.dev |
| `HTTP 400: Bad Request` | Check model name matches API version |
| `HTTP 404: Not Found` | Model not supported in this API version |
| `HTTP 429: Too Many Requests` | Rate limit hit - wait a few seconds and retry |

---

## 📋 Current Configuration

### File: `.env.local`
```env
GEMINI_MODEL=gemini-1.5-flash         # Supported in v1beta
GEMINI_API_VERSION=v1beta             # Correct version for model
GEMINI_FETCH_TIMEOUT_MS=30000         # 30 seconds - enough for most requests
```

### API Endpoint
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_KEY
```

### Request Format (v1beta)
```json
{
  "contents": [{
    "parts": [{"text": "your prompt here"}]
  }],
  "generationConfig": {
    "temperature": 0.2,
    "responseMimeType": "application/json"
  }
}
```

---

## 🔑 Supported Models

| Model | API Version | JSON Support | Status |
|-------|-------------|--------------|--------|
| gemini-1.5-flash | v1beta | ✅ Yes | ✅ Recommended |
| gemini-1.5-pro | v1beta | ✅ Yes | ✅ Available |
| gemini-pro | v1 | ❌ No | ❌ Not compatible |
| gemini-2.5-flash | Not in v1beta | ❌ Unknown | ⚠️ Not tested |

---

## 🐛 Common Errors & Solutions

### Error: "Cannot find field: responseMimeType"
**Cause:** Using wrong API version (v1 instead of v1beta)  
**Fix:** Set `GEMINI_API_VERSION=v1beta` in `.env.local`

```env
GEMINI_API_VERSION=v1beta    # ✅ Correct
# GEMINI_API_VERSION=v1      # ❌ Wrong
```

### Error: "models/gemini-pro is not found for API version v1"
**Cause:** Model not available in API version  
**Fix:** Use correct model for API version

```env
GEMINI_MODEL=gemini-1.5-flash    # ✅ Works with v1beta
# GEMINI_MODEL=gemini-pro        # ❌ Only works with v1
```

### Error: "Invalid JSON payload received"
**Cause:** Wrong field name or format in request  
**Fix:** Check request body format

**❌ Wrong:**
```json
{
  "generationConfig": {
    "response_mime_type": "application/json"  // snake_case wrong for v1beta
  }
}
```

**✅ Correct:**
```json
{
  "generationConfig": {
    "responseMimeType": "application/json"    // camelCase for v1beta
  }
}
```

### Error: "Request timed out"
**Cause:** Complex prompts take longer than configured timeout  
**Fix:** Increase `GEMINI_FETCH_TIMEOUT_MS` in `.env.local`

```env
GEMINI_FETCH_TIMEOUT_MS=60000    # 60 seconds instead of 30
```

### Error: "401: Unauthorized" or "403: Forbidden"
**Cause:** API key invalid or revoked  
**Fix:**
1. Go to https://ai.google.dev/
2. Click "Get API key"
3. Create/regenerate key
4. Update `.env.local`

### Error: "429: Too Many Requests"
**Cause:** Rate limit exceeded  
**Fix:** Wait a few seconds and try again. Consider upgrading API quota on Google Cloud Console.

---

## ✨ Testing Symptom Analysis Directly

### Method 1: Using Browser
1. Open DevTools (F12)
2. Go to Network tab
3. Try booking appointment with symptoms
4. Look for `/api/ai/analyze-symptoms` request
5. Check request/response in Network tab

### Method 2: Using cURL
```bash
curl -X POST http://localhost:3000/api/ai/analyze-symptoms \
  -H "Content-Type: application/json" \
  -d '{
    "symptoms": "gigi sakit dan bengkak",
    "serviceName": "Teeth Cleaning"
  }'
```

**Expected response (if working):**
```json
{
  "emergencyLevel": "moderate",
  "reason": "Swelling indicates inflammation...",
  "recommendation": "See dentist soon..."
}
```

**If API fails gracefully:**
```json
{
  "emergencyLevel": "routine",
  "reason": "AI Analysis encountered an error or timed out. (Defaulting to routine priority)",
  "recommendation": "Please proceed with your booking normally."
}
```

---

## 🔍 Debug Mode

### Enable Detailed Logging
Check server console (where you ran `npm run dev`):

```
[Gemini AI] Initializing API call {
  model: 'gemini-1.5-flash',
  apiVersion: 'v1beta',
  timeoutMs: 30000,
  hasApiKey: true,
  keyPreview: 'AIzaSyDn...'
}

[Gemini AI] Sending request to: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=***

[Gemini AI] Response status: 200

[Gemini AI] Response data received, processing...

[Gemini AI] Successfully parsed result: {
  emergencyLevel: 'routine',
  reason: '...',
  recommendation: '...'
}
```

---

## 📚 References

- [Google Gemini API Docs](https://ai.google.dev/docs)
- [API Models Reference](https://ai.google.dev/models)
- [Supported Methods by Model](https://ai.google.dev/models)

---

## ✅ Verification Checklist

Before deploying, verify:

- [ ] `npm install` dependencies updated
- [ ] `npm run dev` starts without errors
- [ ] `node test-gemini-api.js` returns "SUCCESS"
- [ ] Can make test appointment without AI error
- [ ] Check browser console for no 400/401/404/500 errors
- [ ] Check server console has `[Gemini AI]` debug logs
- [ ] `.env.local` has real API key (not placeholder)
- [ ] `.env.local` is in `.gitignore` ✅

---

## 🚀 Everything Working?

If all tests pass and no errors, your Gemini AI integration is ready! 🎉

Users can now:
1. Book appointments with symptom analysis
2. Get emergency level classification
3. Receive personalized recommendations
4. Have fallback if AI temporarily unavailable
