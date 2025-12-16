"use server";

import { SpeechClient } from "@google-cloud/speech";

function createSpeechClient() {
  const raw = process.env.GOOGLE_SA_KEY;
  if (raw) {
    const sa = JSON.parse(raw) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
    return new SpeechClient({
      projectId: sa.project_id,
      credentials: {
        client_email: sa.client_email,
        private_key: sa.private_key?.replace(/\\n/g, "\n"),
      },
    });
  }
  return new SpeechClient();
}

function inferEncoding(mime: string | undefined) {
  const m = (mime || "").toLowerCase();
  if (m.includes("webm")) return "WEBM_OPUS" as const;
  if (m.includes("ogg")) return "OGG_OPUS" as const;
  return undefined;
}

export async function transcribe(
  formData: FormData,
): Promise<{ text: string; error?: string }> {
  try {
    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return { text: "", error: "No audio file provided" };
    }

    const srRaw = formData.get("sample_rate_hz");
    const sampleRateHertz =
      typeof srRaw === "string" && /^\d+$/.test(srRaw)
        ? Number(srRaw)
        : undefined;

    const ab = await audio.arrayBuffer();
    const content = Buffer.from(ab).toString("base64");

    const client = createSpeechClient();
    const encoding = inferEncoding(audio.type);

    const config: Record<string, unknown> = {
      languageCode: "ja-JP",
      model: "latest_long",
      enableAutomaticPunctuation: true,
    };

    if (encoding) config.encoding = encoding;

    const isOpus = encoding === "WEBM_OPUS" || encoding === "OGG_OPUS";

    if (!isOpus && sampleRateHertz) config.sampleRateHertz = sampleRateHertz;
    if (isOpus) config.audioChannelCount = 2;

    const [res] = await client.recognize({
      config,
      audio: { content },
    });

    const text =
      res.results
        ?.map((r) => r.alternatives?.[0]?.transcript ?? "")
        .join("")
        .trim() || "";

    return { text };
  } catch (err) {
    console.error("[transcribe] error", err);
    return { text: "", error: "Failed to transcribe" };
  }
}
