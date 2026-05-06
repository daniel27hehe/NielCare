import { NextRequest, NextResponse } from "next/server";

// Simple in-memory circuit-breaker for upstream Gemini API rate-limit protection
const CIRCUIT_THRESHOLD = 3;
const CIRCUIT_BASE_COOLDOWN_MS = 60_000;
let aiFailureCount = 0;
let aiCircuitOpenUntil = 0;

const VALID_SPECIALIZATIONS = [
  "General Dentist",
  "Orthodontist",
  "Periodontist",
  "Endodontist",
  "Prosthodontist",
  "Oral Surgeon",
  "Pediatric Dentist",
];

// Simple heuristic fallback untuk ketika AI tidak tersedia.
const heuristicAnalysis = (symptomsText: string | undefined) => {
  const s = (symptomsText || "").toLowerCase();

  // Deteksi gejala orthodontic
  if (/behel|kawat gigi|gigi bengkok|gigi miring|gigi rapi|maloklusi|gigitan|gigi tidak rata/.test(s)) {
    return {
      emergencyLevel: "routine",
      possibleCondition: "Maloklusi / Gigi Tidak Rata",
      reason: "Gejala menunjukkan masalah keselarasan gigi yang memerlukan penanganan ortodontik.",
      recommendation: "Konsultasikan dengan dokter ortodontis untuk evaluasi pemasangan behel atau aligner.",
      estimatedCost: 500000,
      estimatedCostLabel: "Rp 500.000 – Rp 2.000.000",
      recommendedSpecialization: "Orthodontist",
    };
  }

  // Deteksi gejala anak-anak
  if (/anak|gigi susu|gigi bayi|balita/.test(s)) {
    return {
      emergencyLevel: "moderate",
      possibleCondition: "Masalah Gigi Anak",
      reason: "Gejala pada anak memerlukan penanganan dokter gigi anak yang berpengalaman.",
      recommendation: "Kunjungi dokter gigi anak untuk pemeriksaan dan perawatan yang sesuai usia.",
      estimatedCost: 200000,
      estimatedCostLabel: "Rp 150.000 – Rp 400.000",
      recommendedSpecialization: "Pediatric Dentist",
    };
  }

  // Deteksi gejala darurat / parah
  const criticalPattern = /parah|tidak tertahankan|berdarah banyak|nanah|abses|bengkak parah|sesak|pingsan|nyeri hebat|gusi bernanah|sakit banget|sakit sekali|unbearable|severe|bleeding/;
  if (criticalPattern.test(s)) {
    return {
      emergencyLevel: "critical",
      possibleCondition: "Kedaruratan Gigi (Abses / Nyeri Akut)",
      reason: "Gejala mengindikasikan kemungkinan kondisi darurat gigi yang memerlukan penanganan segera.",
      recommendation: "Segera kunjungi klinik atau IGD jika perdarahan atau nyeri parah tidak berhenti.",
      estimatedCost: 750000,
      estimatedCostLabel: "Rp 500.000 – Rp 1.500.000",
      recommendedSpecialization: "Oral Surgeon",
    };
  }

  // Deteksi gejala saraf gigi / perawatan saluran akar
  const endoPattern = /saraf gigi|saluran akar|gigi berlubang dalam|nyeri berdenyut|ngilu dalam|peka panas dingin|sensitive/;
  if (endoPattern.test(s)) {
    return {
      emergencyLevel: "moderate",
      possibleCondition: "Infeksi Pulpa / Gigi Berlubang Dalam",
      reason: "Gejala menunjukkan kemungkinan masalah pada saraf atau pulpa gigi yang perlu ditangani.",
      recommendation: "Segera hubungi klinik untuk janji lebih awal. Gunakan obat pereda nyeri sementara.",
      estimatedCost: 400000,
      estimatedCostLabel: "Rp 300.000 – Rp 800.000",
      recommendedSpecialization: "Endodontist",
    };
  }

  // Deteksi gejala gusi
  const perioPattern = /gusi berdarah|gusi bengkak|karang gigi|bau mulut|gusi turun|periodontitis|gingivitis|scaling/;
  if (perioPattern.test(s)) {
    return {
      emergencyLevel: "moderate",
      possibleCondition: "Penyakit Gusi (Gingivitis / Periodontitis)",
      reason: "Gejala menunjukkan kemungkinan penyakit gusi yang perlu perhatian medis.",
      recommendation: "Hubungi klinik untuk pembersihan karang gigi dan pemeriksaan gusi.",
      estimatedCost: 200000,
      estimatedCostLabel: "Rp 150.000 – Rp 500.000",
      recommendedSpecialization: "Periodontist",
    };
  }

  // Deteksi gejala prostodontik
  const prostoPattern = /gigi palsu|mahkota gigi|implan|gigi copot|tambal lepas|veneer|crown|bridge/;
  if (prostoPattern.test(s)) {
    return {
      emergencyLevel: "routine",
      possibleCondition: "Restorasi Gigi / Protesis",
      reason: "Gejala menunjukkan kebutuhan restorasi atau protesis gigi.",
      recommendation: "Konsultasikan dengan dokter spesialis prostodontik untuk rencana perawatan.",
      estimatedCost: 500000,
      estimatedCostLabel: "Rp 300.000 – Rp 1.500.000",
      recommendedSpecialization: "Prosthodontist",
    };
  }

  // Moderate: nyeri sedang, infeksi ringan
  const moderatePattern = /nyeri|sakit gigi|infeksi|gigi berlubang|ngilu|sensitive|berdenyut|demam|bengkak/;
  if (moderatePattern.test(s)) {
    return {
      emergencyLevel: "moderate",
      possibleCondition: "Masalah Gigi Sedang (Karies / Infeksi Ringan)",
      reason: "Gejala menunjukkan masalah gigi yang perlu mendapat perhatian dalam waktu dekat.",
      recommendation: "Hubungi klinik untuk penjadwalan lebih awal dan gunakan obat pereda nyeri sementara.",
      estimatedCost: 250000,
      estimatedCostLabel: "Rp 200.000 – Rp 600.000",
      recommendedSpecialization: "General Dentist",
    };
  }

  return {
    emergencyLevel: "routine",
    possibleCondition: "Pemeriksaan Gigi Rutin",
    reason: "Gejala yang disampaikan tergolong ringan dan tidak memerlukan penanganan darurat.",
    recommendation: "Jadwalkan pemeriksaan rutin. Gunakan obat kumur antiseptik dan jaga kebersihan mulut.",
    estimatedCost: 150000,
    estimatedCostLabel: "Rp 100.000 – Rp 300.000",
    recommendedSpecialization: "General Dentist",
  };
};

export async function POST(req: NextRequest) {
  let symptoms = "";
  let providerName = "AI";
  let timeoutMs = 30000;

  try {
    const body = await req.json();
    symptoms = body.symptoms;

    if (!symptoms) {
      return NextResponse.json(
        { isValidSymptom: false, rejectionReason: "Keluhan tidak boleh kosong." },
        { status: 400 }
      );
    }

    // ── Backend heuristic pre-validation (fast, before hitting AI) ──────────
    const trimmed = symptoms.trim();
    const REJECT_PATTERNS = [
      { re: /^(tes|test|testing|halo|hallo|hello|hi|hai|hey|yo|hei)\b/i, msg: "Input terdeteksi sebagai sapaan/tes, bukan keluhan gigi." },
      { re: /^(coba|cobain|try|cek|check)\b/i, msg: "Input terdeteksi sebagai percobaan, bukan keluhan gigi." },
      { re: /^(asd|qwe|zxc|asdf|qwerty|abc|xxx|zzz)/i, msg: "Input tidak dapat dikenali. Harap ceritakan keluhan gigi Anda." },
      { re: /^[\d\s\W]+$/, msg: "Input hanya berisi angka atau karakter khusus. Harap ceritakan keluhan gigi Anda." },
    ];
    for (const { re, msg } of REJECT_PATTERNS) {
      if (re.test(trimmed)) {
        console.warn('[AI] Rejected by heuristic pre-validation:', trimmed.slice(0, 50));
        return NextResponse.json(
          { isValidSymptom: false, rejectionReason: msg },
          { status: 422 }
        );
      }
    }
    if (trimmed.split(/\s+/).filter(w => w.length > 1).length < 2) {
      return NextResponse.json(
        { isValidSymptom: false, rejectionReason: "Keluhan terlalu singkat. Harap ceritakan gejala Anda lebih detail." },
        { status: 422 }
      );
    }

    // Support NVAPI as alternative to Gemini
    const nvApiKey = process.env.NVAPI_KEY;
    const useNv = !!nvApiKey;
    const apiKey = useNv ? nvApiKey : process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[AI] No GEMINI_API_KEY or NVAPI_KEY present - using heuristic fallback');
      return NextResponse.json(heuristicAnalysis(symptoms));
    }

    const geminiModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const geminiApiVersion = process.env.GEMINI_API_VERSION || "v1beta";
    timeoutMs = parseInt(process.env.GEMINI_FETCH_TIMEOUT_MS || "30000", 10);
    if (timeoutMs < 5000) timeoutMs = 5000;

    const nvBaseUrl = process.env.NVAPI_BASE_URL || "https://integrate.api.nvidia.com/v1";
    let nvModel = process.env.NVAPI_MODEL || process.env.NVAPI_DEFAULT_MODEL || "deepseek-ai/deepseek-r1";
    const nvFallbackEnv = process.env.NVAPI_FALLBACK_MODELS || '';
    const fallbackModels = nvFallbackEnv ? nvFallbackEnv.split(',').map(s => s.trim()).filter(Boolean) : [
      'meta/llama-3.1-70b-instruct',
      'nvidia/llama-3.1-nemotron-ultra-253b-v1',
      'mistralai/mistral-7b-instruct-v0.3'
    ];

    if (Date.now() < aiCircuitOpenUntil) {
      const retrySecs = Math.ceil((aiCircuitOpenUntil - Date.now()) / 1000);
      console.warn(`[AI] Circuit open. Returning fallback. Retry after ${retrySecs}s`);
      return NextResponse.json({
        ...heuristicAnalysis(symptoms),
        retryAfterSeconds: retrySecs,
      }, { status: 503 });
    }

    providerName = useNv ? 'NVAPI' : 'Gemini';
    console.log(`[AI] Initializing API call`, { provider: providerName, timeoutMs });

    const prompt = `Kamu adalah asisten AI klinik gigi yang HANYA bertugas menganalisis keluhan dan gejala gigi atau mulut.

Pasien mengirimkan input berikut:
"${symptoms}"

LANGKAH 1 — VALIDASI INPUT:
Periksa apakah input di atas merupakan keluhan atau gejala yang berkaitan dengan kesehatan gigi dan mulut.
Tolak input jika:
- Input adalah sapaan, tes, kata acak, atau teks tidak bermakna (contoh: "hallo", "tes", "asdf", "coba")
- Input adalah pertanyaan atau permintaan yang tidak berkaitan dengan gejala gigi (contoh: "berapa harga emas?", "siapa presiden?", "tolong buatkan essay")
- Input adalah kalimat umum yang tidak menyebutkan gejala, rasa sakit, keluhan, atau kondisi terkait gigi/mulut
- Input terlalu singkat atau tidak jelas untuk dianalisis sebagai keluhan kesehatan

Jika input TIDAK VALID, kembalikan JSON:
{
  "isValidSymptom": false,
  "rejectionReason": "[jelaskan dalam 1 kalimat Bahasa Indonesia mengapa ditolak dan apa yang seharusnya diinput]"
}

LANGKAH 2 — JIKA INPUT VALID, analisis keluhan dan kembalikan JSON:
{
  "isValidSymptom": true,
  "emergencyLevel": "critical" | "moderate" | "routine",
  "possibleCondition": "nama kondisi gigi dalam Bahasa Indonesia",
  "reason": "1-2 kalimat penjelasan diagnosis dalam Bahasa Indonesia",
  "recommendation": "saran tindakan singkat dalam Bahasa Indonesia",
  "estimatedCost": <angka estimasi biaya dalam Rupiah, contoh: 350000>,
  "estimatedCostLabel": "Rp XXX.XXX – Rp XXX.XXX",
  "recommendedSpecialization": <salah satu dari: "General Dentist", "Orthodontist", "Periodontist", "Endodontist", "Prosthodontist", "Oral Surgeon", "Pediatric Dentist">
}

Petunjuk emergencyLevel:
- "critical" = darurat: perdarahan hebat, abses, nyeri tak tertahankan, pembengkakan parah
- "moderate" = segera: infeksi, gigi berlubang dalam, bengkak sedang, nyeri yang mengganggu
- "routine" = rutin: kontrol berkala, behel, keluhan ringan, tidak ada rasa sakit

Kembalikan HANYA objek JSON yang valid, tanpa teks tambahan apapun.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/${geminiApiVersion}/models/${geminiModel}:generateContent?key=${apiKey}`;
    const nvUrl = `${nvBaseUrl}/chat/completions`;

    const maxAttempts = 3;
    const baseDelay = 500;
    let attempt = 0;
    let lastError: any = null;
    let data: any = null;

    for (; attempt < maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        console.log(`[AI] ${providerName} Attempt ${attempt + 1} (timeout ${timeoutMs}ms)`);
        const fetchUrl = useNv ? nvUrl : geminiUrl;
        const fetchOpts: RequestInit = useNv ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: nvModel,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 512,
            temperature: 0.2,
          }),
        } : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
          }),
        };

        const response = await fetch(fetchUrl, { ...fetchOpts, signal: controller.signal });
        clearTimeout(timeoutId);
        console.log(`[AI] ${providerName} Response: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 503 || response.status === 500 || response.status === 504) {
            lastError = new Error(`Server error ${response.status}`);
            const waitMs = baseDelay * Math.pow(2, attempt);
            await new Promise((res) => setTimeout(res, waitMs));
            continue;
          }
          if (response.status === 410 && useNv) {
            const nextModel = fallbackModels.shift();
            if (nextModel) { nvModel = nextModel; continue; }
            return NextResponse.json(heuristicAnalysis(symptoms), { status: 410 });
          }
          if (response.status === 429) {
            aiFailureCount = Math.min(aiFailureCount + 1, 10);
            const extraFailures = Math.max(0, aiFailureCount - CIRCUIT_THRESHOLD + 1);
            const cooldownMs = CIRCUIT_BASE_COOLDOWN_MS * Math.pow(2, Math.max(0, extraFailures - 1));
            aiCircuitOpenUntil = Date.now() + cooldownMs;
            return NextResponse.json({ ...heuristicAnalysis(symptoms), retryAfterSeconds: Math.ceil(cooldownMs / 1000) }, { status: 429 });
          }
          throw new Error(`${providerName} API error ${response.status}: ${errorText}`);
        }

        data = await response.json();
        aiFailureCount = 0;
        aiCircuitOpenUntil = 0;
        break;
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;
        const waitMs = baseDelay * Math.pow(2, attempt);
        await new Promise((res) => setTimeout(res, waitMs));
        continue;
      }
    }

    if (!data) {
      console.error(`[AI][${providerName}] All attempts failed:`, lastError);
      return NextResponse.json(heuristicAnalysis(symptoms), { status: 200 });
    }

    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || data.choices?.[0]?.message?.content;
    if (!textResult) throw new Error("Tidak ada teks dari provider AI");

    let parsedResult;
    try {
      parsedResult = JSON.parse(textResult);
    } catch (e) {
      console.error(`[AI][${providerName}] Gagal parse JSON:`, textResult);
      throw new Error("JSON tidak valid dari provider AI");
    }

    // Validate recommendedSpecialization
    const recSpec = parsedResult.recommendedSpecialization;
    const validSpec = VALID_SPECIALIZATIONS.includes(recSpec) ? recSpec : "General Dentist";

    // AI rejected the input as non-dental
    if (parsedResult.isValidSymptom === false) {
      console.warn('[AI] Input rejected by AI as non-dental symptom');
      return NextResponse.json(
        { isValidSymptom: false, rejectionReason: parsedResult.rejectionReason || "Input tidak dikenali sebagai keluhan gigi. Harap ceritakan gejala gigi atau mulut yang Anda rasakan." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      isValidSymptom: true,
      emergencyLevel: parsedResult.emergencyLevel || "routine",
      possibleCondition: parsedResult.possibleCondition || "Masalah Gigi Umum",
      reason: parsedResult.reason || "Analisis selesai.",
      recommendation: parsedResult.recommendation || "Lanjutkan dengan booking.",
      estimatedCost: parsedResult.estimatedCost || 150000,
      estimatedCostLabel: parsedResult.estimatedCostLabel || "Rp 100.000 – Rp 300.000",
      recommendedSpecialization: validSpec,
    });
  } catch (error: any) {
    console.error(`[AI][${providerName}] Error:`, error?.message);
    const heuristic = heuristicAnalysis(symptoms);
    return NextResponse.json({
      ...heuristic,
      reason: `Terjadi kesalahan pada AI. Menggunakan analisis fallback. ${heuristic.reason}`,
    });
  }
}
