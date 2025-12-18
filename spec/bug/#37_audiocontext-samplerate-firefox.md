## 概要
Opus sample rateが44100になってしまっていることに起因するエラーが発生している。
```
[transcribe] error Error: 3 INVALID_ARGUMENT: Invalid recognition 'config': Opus sample rate (44100) not in supported rates 8000, 12000, 16000, 24000, 48000.
    at ignore-listed frames {
  code: 3,
  details: "Invalid recognition 'config': Opus sample rate (44100) not in supported rates 8000, 12000, 16000, 24000, 48000.",
  metadata: [Metadata],
  note: 'Exception occurred in retry method that was not classified as transient'
}
```
使用しているヘッドセットは1 channels, 16bit, 16000Hzなので、規格に合っているはずですが、なぜか4.41kになっている。

## 原因
[ブラウザ上でリアルタイムに音声を処理するためのノウハウ](https://zenn.dev/tetter/articles/web-realtime-audio-processing#%E3%82%B5%E3%83%B3%E3%83%97%E3%83%AB%E3%83%AC%E3%83%BC%E3%83%88%E3%81%AE%E5%A4%89%E6%8F%9B)によると、firefoxでは`AudioContext`のサンプルレートを直接指定するのができないようだ。

> AudioContextによるリサンプリング機能はW3Cの仕様上ではMUSTな機能として定義されていますが、ブラウザ毎の実装差分が残っています。
> ChromeとSafariでは問題なく動作することを確認できましたが、FirefoxではConnecting AudioNodes from AudioContexts with different sample-rate is currently not supported.という警告が表示されるため現時点では対応できていないようです。

そのため、[BaseAudioContext: sampleRate プロパティ - Web API | MDN](https://developer.mozilla.org/ja/docs/Web/API/BaseAudioContext/sampleRate)を利用した実装が確実かもしれない。

ただ、MDNのブラウザーの互換性によると、firefoxは`sampleRate`プロパティに対応しているようなので、別の問題が発生しているのかもしれない。
