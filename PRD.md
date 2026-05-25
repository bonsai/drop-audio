# PRD: AudioMotion Studio

> Remotion Studio の音楽版 — コードで音楽を作曲・プレビュー・レンダリングするフレームワーク

## 1. プロダクト概要

### 1.1 プロダクト名
**AudioMotion Studio**（仮）  
コードベースの音楽制作フレームワーク + プレビュー環境

### 1.2 一言で言うと
React コンポーネントで動画を生成する Remotion の、音楽/オーディオ版。

### 1.3 誰のためのものか
- **音楽プログラマー**：コードで楽曲を生成したい人
- **ゲーム開発者**：動的 BGM/SFX をプログラムで生成したい
- **作曲家**：生成的な音楽制作を探求したい人
- **Remotion ユーザー**：動画内の音楽トラックをコード管理したい

### 1.4 既存のアナロジー

| Remotion | AudioMotion |
|---|---|
| `<Composition>` | `<Composition>`（BPM, 拍子, 長さ） |
| `<Sequence>` | `<Sequence>`（小節ベースのタイムライン） |
| `<AbsoluteFill>` | `<MasterTrack>` |
| `<Img>/<Video>` | `<Sample>`, `<Synth>` |
| `<Transition>` | `<Effect>`（リバーブ、ディレイ、フィルター） |
| frame インデックス | ビート/ tick インデックス |
| `useCurrentFrame()` | `useCurrentTick()` / `useCurrentBeat()` |
| `npx remotion preview` | `npx audiomotion studio` |
| `npx remotion render` | `npx audiomotion render` |

---

## 2. 必須要件（MVP）

### 2.1 コアフレームワーク（React）

```
<Composition
  id="my-beat"
  bpm={120}
  timeSignature={[4, 4]}
  totalBeats={16}
>
  <Track name="kick">
    <Note beat={0} length={1} pitch="C2" />
    <Note beat={2} length={1} pitch="C2" />
  </Track>
  <Track name="hihat">
    <Note beat={0} length={0.5} pitch="F#4" velocity={0.5} />
    <Note beat={1} length={0.5} pitch="F#4" velocity={0.5} />
  </Track>
</Composition>
```

**コンポーネント一覧（MVP）**:

| コンポーネント | 役割 |
|---|---|
| `<Composition>` | 楽曲定義（BPM, 拍子, 長さ） |
| `<Track>` | トラック（楽器/音源ごとのレイヤー） |
| `<Note>` | ノート（ピッチ, ベロシティ, タイミング） |
| `<Sample>` | サンプリング音源（wav/mp3 ファイルを指定） |
| `<Synth>` | シンセサイザー（波形, ADSR 指定） |
| `<Effect>` | エフェクト（リバーブ, ディレイ） |
| `<Sequence>` | パターンのループ/シーケンス |

### 2.2 プレビュースタジオ（ブラウザ UI）

Remotion Studio と同等の GUI:

- 波形/ピアノロール表示
- 再生/停止/スクラブ
- BPM/拍子設定パネル
- トラック別ミュート/ソロ
- レンダリング進捗表示

### 2.3 レンダリングパイプライン

```
ソースコード → AST → スケジューラ → オーディオグラフ → WAV/MP3
```

- **CLI**: `npx audiomotion render --entry=src/music.tsx --out=output.mp3`
- **出力形式**: WAV / MP3 / FLAC
- **レンダリング方法**: OfflineAudioContext（Node.js + ブラウザ両対応）

### 2.4 アーキテクチャ

```
┌──────────────────────────────────────┐
│  user code (React Components)        │
│  src/beat.tsx                         │
└──────────────┬───────────────────────┘
               │ React SSR / renderToString
               ▼
┌──────────────────────────────────────┐
│  AudioMotion Compiler                │
│  - AST に変換                        │
│  - タイムライン解決                   │
│  - オーディオグラフ構築               │
└──────┬───────────────────────┬───────┘
       │                       │
       ▼                       ▼
┌──────────────┐    ┌──────────────────┐
│  Preview     │    │  Renderer        │
│  (Browser)   │    │  (Node.js)       │
│  ScriptNode  │    │  OfflineAudioCtx │
└──────────────┘    └──────┬───────────┘
                           ▼
                    ┌──────────────────┐
                    │  MP3 / WAV       │
                    └──────────────────┘
```

---

## 3. 技術スタック（案）

| レイヤー | 技術 |
|---|---|
| 言語 | TypeScript (厳格モード) |
| UI フレームワーク | React + Tailwind |
| オーディオ処理 (ブラウザ) | Web Audio API (AudioWorklet) |
| オーディオ処理 (Node) | node-audio / sox bindings |
| レンダリング | OfflineAudioContext → WAV エンコード |
| MP3 エンコード | lamejs / ffmpeg |
| MIDI | midi-writer-js / tonejs/Midi |
| スタジオ UI | React, WaveSurfer.js, 独自 Timeline |
| ビルド | Vite + tsup |
| CLI | Commander / yargs |
| テスト | Vitest |
| Lint | Biome / ESLint + Prettier |

---

## 4. フェーズ計画

### Phase 1: Core (2-3週間)
- `@audiomotion/core` パッケージ
- `<Composition>`, `<Track>`, `<Note>` コンポーネント
- CLIRenderer: WAV 出力 (`npx audiomotion render`)
- BPM/tick 解決エンジン

### Phase 2: Studio (2-3週間)
- `@audiomotion/studio` パッケージ
- ブラウザプレビュー（波形＋トランスポート）
- ホットリロード
- `<Sample>`, `<Synth>`, `<Effect>` コンポーネント
- ピアノロール表示

### Phase 3: 実用機能 (2週間)
- MP3 エンコード
- MIDI インポート/エクスポート
- マルチトラックレンダリング
- `<Sequence>` + パターンシステム
- プラグイン（VST？）

### Phase 4: エコシステム
- VSCode 拡張
- AudioMotion × Remotion 統合（動画のBGMをコードで）
- プリセット/テンプレートマーケット
- Dropbox 連携（アップロード/共有）

---

## 5. 非機能要件

- レンダリング速度: 実時間の 2x 以上（Phase 1）
- メモリ: 5分の楽曲で 500MB 以下
- ブラウザプレビュー: 60fps 波形更新
- エラーハンドリング: 無効なノート/パスは開発者コンソールに警告
- TypeScript 型安全: 全てのコンポーネントに strict な型定義

---

## 6. 類似プロジェクトとの差別化

| プロダクト | 違い |
|---|---|
| **Tone.js** | ライブラリのみ。AudioMotion は宣言的コンポーネント + Studio UI を持つ |
| **Sonic Pi** | コード音楽。Ruby ベース、Web プレビューなし。AudioMotion は React エコシステム |
| **Orca** | ビジュアルライブコーディング。AudioMotion はテキストベース + コンポーネント志向 |
| **Remotion** | 動画特化。AudioMotion は音楽特化でオーディオグラフを直接操作 |
| **SuperCollider** | サーバー/クライアント方式。AudioMotion はフロントエンド完結 |

---

## 7. Open Questions

- レンダリングは Node.js OfflineAudioContext か、ffmpeg/subprocess 経由か？
- サンプリングレート: 44100 / 48000？
- プラグイン形式: Web Audio AudioWorklet のみ？ 将来的に VST3？
- 商用ライセンス？（Remotion は非商用無料、商用有料）
- タイムラインの精度: tick あたりの分解能（PPQN 384 / 960？）

---

## 8. 成功基準

- MVP でドラムビート + ベースライン + メロディの3トラック楽曲を作曲・レンダリング可能
- ブラウザプレビューでの再生遅延 < 50ms
- Render CLI で 3分楽曲を 30秒以内に出力
- GitHub スター 100（Phase 1 リリースから3ヶ月）

---

*作成日: 2026-05-26*
*著者: Crush (bonsai の指示による)*
