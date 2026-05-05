import { NextRequest, NextResponse } from "next/server";

// Simple in-memory circuit-breaker for upstream Gemini API rate-limit protection
const CIRCUIT_THRESHOLD = 3; // number of consecutive rate-limit failures before opening circuit
const CIRCUIT_BASE_COOLDOWN_MS = 60_000; // base cooldown 60s, doubles each additional failure
let aiFailureCount = 0;
let aiCircuitOpenUntil = 0; // timestamp (ms) until which circuit is open

export async function POST(req: NextRequest) {
  try {
    const { symptoms, serviceName } = await req.json();

    if (!symptoms || !serviceName) {
      return NextResponse.json(
        { error: "Symptoms and serviceName are required" },
        { status: 400 }
      );
    }

    // Simple heuristic fallback for when the AI service is unavailable.
    const heuristicAnalysis = (symptomsText: string | undefined, svc?: string) => {
      const s = (symptomsText || "").toLowerCase();
      const criticalPattern = /severe|unbearable|excruciating|heavy bleeding|bleeding|pus|abscess|swelling|lost consciousness|difficulty breathing|intense pain/;
      const moderatePattern = /sharp pain|throbbing|fever|infection|sensitivity|persistent pain|moderate pain|swollen|pain when chewing/;

      if (criticalPattern.test(s)) {
        return {
          emergencyLevel: "critical",
          reason: "Symptoms indicate a possible severe dental emergency.",
          recommendation: "Seek immediate urgent care or ER if bleeding or severe pain persists."
        };
      }

      if (moderatePattern.test(s)) {
        return {
          emergencyLevel: "moderate",
          reason: "Symptoms suggest a significant dental issue that may need prompt attention.",
          recommendation: "Contact the clinic for an earlier appointment and consider pain relief measures."
        };
      }

      return {
        emergencyLevel: "routine",
        reason: "Symptoms appear non-urgent based on the provided description.",
        recommendation: "Schedule a regular appointment and use over-the-counter remedies as needed."
      };
    };

    // Support NVAPI (NVIDIA Integrate) as alternative to Gemini.
    const nvApiKey = process.env.NVAPI_KEY;
    const useNv = !!nvApiKey;
    const apiKey = useNv ? nvApiKey : process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[AI] No GEMINI_API_KEY or NVAPI_KEY present - using heuristic fallback');
      return NextResponse.json(heuristicAnalysis(symptoms, serviceName));
    }

    // Gemini settings (only used if NVAPI not provided)
    const geminiModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const geminiApiVersion = process.env.GEMINI_API_VERSION || "v1beta";
    let timeoutMs = parseInt(process.env.GEMINI_FETCH_TIMEOUT_MS || "30000", 10);
    if (timeoutMs < 5000) timeoutMs = 5000;

    // NVAPI settings
    const nvBaseUrl = process.env.NVAPI_BASE_URL || "https://integrate.api.nvidia.com/v1";
    let nvModel = process.env.NVAPI_MODEL || process.env.NVAPI_DEFAULT_MODEL || "deepseek-ai/deepseek-r1";
    const nvFallbackEnv = process.env.NVAPI_FALLBACK_MODELS || '';
    const fallbackModels = nvFallbackEnv ? nvFallbackEnv.split(',').map(s => s.trim()).filter(Boolean) : [
      'meta/llama-3.1-70b-instruct',
      'nvidia/llama-3.1-nemotron-ultra-253b-v1',
      'mistralai/mistral-7b-instruct-v0.3'
    ];

    // Circuit-breaker short-circuits requests if upstream has been rate-limiting
    if (Date.now() < aiCircuitOpenUntil) {
      const retrySecs = Math.ceil((aiCircuitOpenUntil - Date.now()) / 1000);
      console.warn(`[AI] Circuit open. Returning fallback. Retry after ${retrySecs}s`);
      return NextResponse.json({
        emergencyLevel: "routine",
        reason: `AI temporarily unavailable due to repeated rate limits. Try again in ${retrySecs} seconds.`,
        recommendation: "Please proceed with normal booking.",
        retryAfterSeconds: retrySecs,
      }, { status: 503 });
    }

    const providerName = useNv ? 'NVAPI' : 'Gemini';
    console.log(`[AI] Initializing API call`, { provider: providerName, timeoutMs, keyPreview: apiKey.substring(0, 10) + '...' });

    const prompt = `You are an AI dental assistant. Analyze the following patient symptoms for a dental booking.
Service requested: ${serviceName}
Symptoms: ${symptoms}

Determine the emergency level. It MUST be one of: "critical", "moderate", or "routine".

Also provide a short reason (max 2 sentences) and a brief recommendation (e.g., "Take pain relievers while waiting", "Go to ER if bleeding doesn't stop").

Return ONLY a valid JSON object matching this schema exactly:
{
  "emergencyLevel": "critical" | "moderate" | "routine",
  "reason": "string",
  "recommendation": "string"
}`;

    // Prepare request target and body depending on provider
    const geminiUrl = `https://generativelanguage.googleapis.com/${geminiApiVersion}/models/${geminiModel}:generateContent?key=${apiKey}`;
    const nvUrl = `${nvBaseUrl}/chat/completions`;
    console.log(`[AI] Prepared request to: ${useNv ? nvUrl.replace(apiKey, '***') : geminiUrl.replace(apiKey, '***')}`);

    // Retry logic for transient failures (503, 500, network errors)
    const maxAttempts = 3;
    const baseDelay = 500; // ms
    let attempt = 0;
    let lastError: any = null;
    let data: any = null;

    for (; attempt < maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        console.log(`[AI] ${providerName} Attempt ${attempt + 1} sending request (timeout ${timeoutMs}ms)`);
        const fetchUrl = useNv ? nvUrl : geminiUrl;
        const fetchOpts = useNv ? {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: nvModel,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 512,
            temperature: 0.2,
          }),
        } : {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [ { parts: [{ text: prompt }] } ],
            generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
          }),
        };

        const response = await fetch(fetchUrl, { ...fetchOpts, signal: controller.signal });

        clearTimeout(timeoutId);

        console.log(`[AI] ${providerName} Response status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[${providerName} API] Error response:`, {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          });

          // If service unavailable or server error, retry with backoff
          if (response.status === 503 || response.status === 500 || response.status === 504) {
            lastError = new Error(`Server error ${response.status}: ${response.statusText}`);
            // respect Retry-After header if present
            const retryAfter = response.headers.get?.('Retry-After');
            const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : baseDelay * Math.pow(2, attempt);
            console.warn(`[AI] ${providerName} Retrying after ${waitMs}ms due to server error`);
            await new Promise((res) => setTimeout(res, waitMs));
            continue; // next attempt
          }

          // Handle model EOL for NVAPI (410) by trying fallback models
          if (response.status === 410 && useNv) {
            console.warn(`[AI] ${providerName} model ${nvModel} returned 410 Gone - trying fallback model if available`);
            const nextModel = fallbackModels.shift();
            if (nextModel) {
              nvModel = nextModel;
              console.warn(`[AI] Switching NVAPI model to ${nvModel} and retrying`);
              // small backoff before retry
              await new Promise((res) => setTimeout(res, baseDelay * 2));
              continue; // retry with new model
            }
            console.error(`[AI] No NVAPI fallback models available; returning heuristic fallback`);
            return NextResponse.json({
              ...heuristicAnalysis(symptoms, serviceName),
              reason: `NVAPI model ${nvModel} is unavailable and no fallback models configured.`,
            }, { status: 410 });
          }

          // Non-retriable errors: authentication, bad request, rate limiting -> surface error
          if (response.status === 400) {
            throw new Error(`Bad request: Invalid API call format (${response.statusText}) - ${errorText}`);
            } else if (response.status === 401 || response.status === 403) {
            throw new Error(`Authentication failed: Check your API key (Status ${response.status}) - ${errorText}`);
          } else if (response.status === 429) {
            // Upstream rate limit - open circuit and return heuristic fallback to client
            aiFailureCount = Math.min(aiFailureCount + 1, 10);
            const extraFailures = Math.max(0, aiFailureCount - CIRCUIT_THRESHOLD + 1);
            const cooldownMs = CIRCUIT_BASE_COOLDOWN_MS * Math.pow(2, Math.max(0, extraFailures - 1));
            aiCircuitOpenUntil = Date.now() + cooldownMs;
            const retrySecs = Math.ceil(cooldownMs / 1000);
            console.warn(`[AI] ${providerName} Received 429. Opening circuit for ${retrySecs}s (failureCount=${aiFailureCount})`);
            return NextResponse.json({
              ...heuristicAnalysis(symptoms, serviceName),
              retryAfterSeconds: retrySecs,
            }, { status: 429 });
          } else {
            throw new Error(`${providerName} API returned status ${response.status}: ${response.statusText} - ${errorText}`);
          }
        }

        data = await response.json();
        // Reset failure counter on success
        aiFailureCount = 0;
        aiCircuitOpenUntil = 0;
        break; // success
      } catch (err: any) {
        clearTimeout(timeoutId);
        // Handle AbortError (timeout) as transient
        if (err?.name === 'AbortError') {
          console.warn(`[AI][${providerName}] Attempt ${attempt + 1} aborted due to timeout`);
          lastError = err;
          const waitMs = baseDelay * Math.pow(2, attempt);
          await new Promise((res) => setTimeout(res, waitMs));
          continue;
        }

        // Network or other transient errors -> retry
        console.error(`[AI][${providerName}] Attempt ${attempt + 1} failed:`, err?.message || err);
        lastError = err;
        const waitMs = baseDelay * Math.pow(2, attempt);
        await new Promise((res) => setTimeout(res, waitMs));
        continue;
      }
    }

    if (!data) {
      console.error(`[AI][${providerName}] All attempts failed:`, lastError);
      // Fall back to heuristic analysis so booking flow isn't blocked
      const fallback = heuristicAnalysis(symptoms, serviceName);
      return NextResponse.json(fallback, { status: 200 });
    }
    console.log(`[AI][${providerName}] Response data received, processing...`);

    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || data.choices?.[0]?.message?.content;

    if (!textResult) {
      console.error(`[AI][${providerName}] No text in response:`, data);
      throw new Error("No text returned from AI provider");
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(textResult);
    } catch (e) {
      console.error(`[AI][${providerName}] Failed to parse JSON response:`, textResult);
      throw new Error("Invalid JSON from AI provider");
    }

    console.log(`[AI][${providerName}] Successfully parsed result:`, parsedResult);

    return NextResponse.json({
      emergencyLevel: parsedResult.emergencyLevel || "routine",
      reason: parsedResult.reason || "Analysis complete.",
      recommendation: parsedResult.recommendation || "Proceed with booking.",
    });
  } catch (error: any) {
    console.error(`[AI][${providerName}] Error encountered:`, {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      stack: error?.stack?.split('\n')[0]  // First line of stack trace
    });

    // Specific error handling
    let reason = "AI Analysis encountered an error.";
    let recommendation = "Please proceed with your booking normally.";

    if (error?.name === 'AbortError') {
      reason = "AI Analysis timed out - took too long to respond.";
      console.error(`[AI][${providerName}] REQUEST TIMEOUT after ${timeoutMs}ms`);
    } else if (error?.message?.includes('Rate limit')) {
      reason = "Too many AI requests. Please try again later.";
    } else if (error?.message?.includes('Authentication')) {
      reason = "AI system authentication issue. Please try again.";
      console.error(`[AI][${providerName}] AUTHENTICATION ERROR - Check your API key!`);
    } else if (error?.message?.includes('Bad request')) {
      reason = "AI request format error. This is a server configuration issue.";
      console.error(`[AI][${providerName}] BAD REQUEST - API format may have changed`);
    } else if (error?.message?.includes('server error')) {
      reason = "Gemini AI server is having issues. Please try again later.";
    }

    // Graceful heuristic fallback so the booking isn't blocked if AI fails
    const heuristic = heuristicAnalysis(symptoms, serviceName);
    return NextResponse.json({
      ...heuristic,
      reason: `${reason} (Fallback applied)`,
      debug: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
}
