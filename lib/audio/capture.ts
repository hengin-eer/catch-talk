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
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.stream;
    } catch (error) {
      console.error("Failed to get user media:", error);
      throw error;
    }
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
