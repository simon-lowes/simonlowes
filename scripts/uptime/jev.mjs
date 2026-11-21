// Jev judges; code decides. All questions and thresholds live here.
// OFF unless TYPESAFE_API_KEY is set. Any API failure returns null (plain checks only).
export const THRESHOLDS = { broken: 0.7, expectedMax: 0.3 };

export const questions = {
  broken: {
    type: "noul",
    instructions:
      "Does the screenshot SHOT look broken: blank, unstyled HTML, overlapping text, broken-image icons, or an error page?",
  },
  expected: {
    type: "noul",
    instructions: "Is the main content described in `expected` visible in the screenshot SHOT?",
  },
};

export async function judge({ site, expected, pngBase64 }) {
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.typesafe.ai/v1/systemone", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "TypeSafe-Danger-Zone-Images": "true",
      },
      body: JSON.stringify({
        model: process.env.JEV_MODEL || "jev-latest",
        state: { site, expected, screenshot: "SHOT" },
        questions,
        assets: { SHOT: { type: "image", format: "png", data_base64: pngBase64 } },
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const a = await res.json();
    return { broken: a.broken?.noul, expected: a.expected?.noul };
  } catch (e) {
    console.warn(`Jev unavailable for ${site}: ${e.message}`);
    return null;
  }
}

/** Code decides: returns a list of problem strings (empty = looks fine). */
export function decide(j) {
  if (!j) return [];
  const out = [];
  if (typeof j.broken === "number" && j.broken >= THRESHOLDS.broken)
    out.push(`Jev: page looks broken (p=${j.broken.toFixed(2)})`);
  if (typeof j.expected === "number" && j.expected <= THRESHOLDS.expectedMax)
    out.push(`Jev: expected content not visible (p=${j.expected.toFixed(2)})`);
  return out;
}
