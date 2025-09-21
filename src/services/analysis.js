const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const extractJson = content => {
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch (error) {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (innerError) {
        return null;
      }
    }
    return null;
  }
};

export const analyzeTranscriptForTheft = async (transcript, signal) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key missing. Set VITE_GEMINI_API_KEY to enable transcript analysis.');
  }

  const text = transcript.trim();
  if (!text) {
    return { alert: false, reason: '' };
  }

  const endpoint = `${GEMINI_ENDPOINT_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      system_instruction: {
        role: 'system',
        parts: [
          {
            text: 'You classify bike security audio transcripts. Respond ONLY with JSON like {"alert":true|false,"reason":"short explanation"}. Flag potential theft, tampering, break-in, or distress.',
          },
        ],
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Transcript to classify:\n"""${text}"""`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
      },
    }),
    signal,
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data?.error?.message || 'Gemini analysis failed.';
    throw new Error(message);
  }

  const contentParts = data?.candidates?.[0]?.content?.parts || [];
  const combined = contentParts.map(part => part?.text ?? '').join('').trim();
  const parsed = extractJson(combined);

  if (!parsed) {
    throw new Error('Unexpected response from Gemini analysis.');
  }

  return {
    alert: Boolean(parsed.alert),
    reason: parsed.reason || '',
  };
};
