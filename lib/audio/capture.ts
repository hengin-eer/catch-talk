export class AudioStreamCapture {
  private stream: MediaStream | null = null;

  async start(deviceId: string): Promise<MediaStream> {
    if (this.stream) {
      this.stop();
    }

    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: { exact: deviceId },
        echoCancellation: true,
        noiseSuppression: false, // 自前のノイズ除去を使うためOFF推奨だが、ブラウザ実装も優秀なので要検討。一旦OFF。
        autoGainControl: true,
      },
      video: false,
    };

    try {
      this.stream = await this.getUserMediaWithRetry(constraints);
      return this.stream;
    } catch (error) {
      console.error("Failed to get user media:", error);
      throw error;
    }
  }

  private async getUserMediaWithRetry(
    constraints: MediaStreamConstraints,
    retries = 3,
    delay = 500,
  ): Promise<MediaStream> {
    for (let i = 0; i < retries; i++) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        if (
          i < retries - 1 &&
          error instanceof DOMException &&
          (error.name === "NotReadableError" ||
            error.name === "TrackStartError")
        ) {
          console.warn(
            `getUserMedia failed with ${error.name}, retrying in ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    throw new Error("Unreachable");
  }

  stop() {
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }
  }

  getStream(): MediaStream | null {
    return this.stream;
  }
}
