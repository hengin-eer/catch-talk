import { transcribe } from "@/app/actions/transcribe";

type STTOptions = {
  sample_rate_hz?: number;
};

export async function stt(
  blob: Blob,
  options: STTOptions = {},
): Promise<string> {
  const formData = new FormData();
  formData.append("audio", blob);
  if (options.sample_rate_hz) {
    formData.append("sample_rate_hz", options.sample_rate_hz.toString());
  }

  try {
    const result = await transcribe(formData);
    if (result.error) {
      console.error("STT Error:", result.error);
      return "failed STT";
    }
    return result.text || "failed STT";
  } catch (e) {
    console.error("STT Exception:", e);
    return "failed STT";
  }
}
