const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const safeParseJson = content => {
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch (error) {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (innerError) {
      return null;
    }
  }
};

const buildContextPrompt = (file, timestamps = []) => {
  const sizeMB = file.size ? (file.size / (1024 * 1024)).toFixed(2) : 'unknown';
  const type = file.type || 'unknown format';
  const timestampText =
    timestamps && timestamps.length
      ? `Motion or notable events were detected around these timestamps: ${timestamps.join(', ')}.`
      : 'No specific motion timestamps were provided.';

  return `You are assisting with bike security monitoring. A video clip named "${file.name}" (${type}, about ${sizeMB} MB) was uploaded for analysis. ${timestampText} Based on typical bike theft behaviour (tools, lingering, tampering, sudden flight), assess the likelihood of suspicious activity. Respond ONLY with JSON of the form {"suspicious": boolean, "likelihood": "low"|"medium"|"high", "confidence": number between 0 and 1, "summary": "short explanation"}.`;
};

export const analyzeVideoThreat = async (file, { timestamps } = {}) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key missing. Set VITE_GEMINI_API_KEY to enable video analysis.');
  }

  const endpoint = `${GEMINI_ENDPOINT_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const prompt = buildContextPrompt(file, timestamps);

  let payload;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
        },
      }),
    });

    payload = await response.json();

    if (!response.ok) {
      const message = payload?.error?.message || 'Gemini video analysis failed.';
      throw new Error(message);
    }
  } catch (apiError) {
    const message = apiError instanceof Error ? apiError.message : 'Unknown analysis failure.';
    return {
      error: message,
    };
  }

  const parts = payload?.candidates?.[0]?.content?.parts || [];
  const combined = parts.map(part => part?.text ?? '').join('').trim();
  const parsed = safeParseJson(combined);

  if (!parsed) {
    return {
      error: 'Unexpected response from Gemini video analysis.',
    };
  }

  const suspicious = Boolean(parsed.suspicious);
  let confidence;
  if (typeof parsed.confidence === 'number') {
    confidence = Math.min(1, Math.max(0, parsed.confidence));
  } else if (typeof parsed.confidence === 'string') {
    const parsedNumber = parseFloat(parsed.confidence.replace('%', ''));
    if (!Number.isNaN(parsedNumber)) {
      confidence = parsed.confidence.includes('%') ? parsedNumber / 100 : parsedNumber;
      confidence = Math.min(1, Math.max(0, confidence));
    }
  }
  if (confidence == null) {
    confidence = suspicious ? 0.75 : 0.1;
  }

  return {
    suspicious,
    likelihood: parsed.likelihood ?? 'unknown',
    confidence,
    summary: parsed.summary ?? 'No summary provided.',
  };
};
