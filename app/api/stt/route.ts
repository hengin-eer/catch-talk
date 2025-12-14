import { SpeechClient } from "@google-cloud/speech";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

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

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const audio = form.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json({ text: "failed STT" }, { status: 400 });
    }

    const srRaw = form.get("sample_rate_hz");
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

    // Opusは sampleRateHertz 指定で事故ることがあるので基本は付けない
    if (!isOpus && sampleRateHertz) config.sampleRateHertz = sampleRateHertz;

    // 今の録音（MediaStreamDestination経由）は2chになっているため合わせる
    // ※将来的にクライアント側でmono化したらここも1 or 未指定に変更する
    if (isOpus) config.audioChannelCount = 2;

    const [res] = await client.recognize({
      config,
      audio: { content },
    });

    const text =
      res.results
        ?.map((r) => r.alternatives?.[0]?.transcript ?? "")
        .join("")
        .trim() || "failed STT";

    return NextResponse.json({ text });
  } catch (err) {
    console.error("[/api/stt] error", err);
    return NextResponse.json({ text: "failed STT" }, { status: 500 });
  }
}
