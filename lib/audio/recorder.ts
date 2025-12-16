import type { RecorderConfig } from "./types";

export class MediaStreamRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private dest: MediaStreamAudioDestinationNode;
  private mimeType: string | undefined;

  constructor(
    private ctx: AudioContext,
    config?: RecorderConfig,
  ) {
    this.dest = this.ctx.createMediaStreamDestination();
    this.mimeType = config?.mimeType || this.pickMimeType();
  }

  private pickMimeType(): string | undefined {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg",
    ];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c)) return c;
    }
    return undefined;
  }

  connectInput(node: AudioNode) {
    node.connect(this.dest);
  }

  start() {
    if (this.recorder && this.recorder.state !== "inactive") {
      console.warn("Recorder already started");
      return;
    }

    this.chunks = [];
    this.recorder = new MediaRecorder(this.dest.stream, {
      mimeType: this.mimeType,
    });

    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    this.recorder.start();
  }

  async stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.recorder || this.recorder.state === "inactive") {
        resolve(new Blob([], { type: this.mimeType }));
        return;
      }

      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mimeType });
        this.chunks = [];
        resolve(blob);
      };

      this.recorder.stop();
    });
  }

  getMimeType(): string | undefined {
    return this.mimeType;
  }
}
