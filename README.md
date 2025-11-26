# My Config LSP Extension

独自拡張ファイル（`.myconfig`）の文法チェックを行うVSCode LSP Extension のサンプルです。

## 機能

- **リアルタイム文法チェック**: YAMLベースの独自設定ファイルをリアルタイムでバリデーション
- **必須フィールドチェック**: `name`、`version` フィールドの存在チェック
- **型チェック**: 各フィールドの型が正しいかチェック
- **補完機能**: フィールド名の自動補完
- **ホバー情報**: フィールドにホバーすると説明が表示

## スキーマ

`.myconfig` ファイルは以下のスキーマに従います：

```yaml
name: string        # 必須: アプリケーション名
version: string     # 必須: バージョン番号
enabled: boolean    # オプション: 有効/無効フラグ
settings:           # オプション: 詳細設定
  timeout: number   # タイムアウト時間（秒）
  retries: number   # リトライ回数
```

## セットアップ

### 前提条件

- Node.js 18以上
- VSCode 1.75以上

### インストール

```bash
# 依存パッケージをインストール
npm install

# ビルド
npm run compile
```

## 開発

### デバッグ実行

1. VSCodeでこのプロジェクトを開く
2. 以下のいずれかの方法でデバッグを開始：
   - **Mac**: `fn + F5` または メニューから `Run > Start Debugging`
   - **Windows/Linux**: `F5`
   - または: `Cmd/Ctrl + Shift + D` でデバッグビューを開き、再生ボタン（▶）をクリック
3. 新しいVSCodeウィンドウ（Extension Development Host）が開く
4. `sample/` フォルダ内の `.myconfig` ファイルを開いて動作確認

### ウォッチモード

```bash
npm run watch
```

## ディレクトリ構造

```
example-lsp/
├── package.json              # ルートpackage.json（VSCode extension設定含む）
├── tsconfig.json             # TypeScript設定（Project References）
├── language-configuration.json # 言語設定
├── client/                   # VSCode Extension（クライアント）
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── extension.ts      # エントリーポイント
├── server/                   # LSPサーバー
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── server.ts         # サーバー実装
├── sample/                   # テスト用サンプルファイル
│   ├── valid.myconfig        # 正常なファイル
│   └── invalid.myconfig      # エラーがあるファイル
└── .vscode/
    ├── launch.json           # デバッグ設定
    └── tasks.json            # タスク設定
```

## 主なファイルの説明

### server/src/server.ts

LSPサーバーの実装。以下の機能を提供：

- `onInitialize`: サーバー機能の宣言
- `onDidChangeContent`: ドキュメント変更時のバリデーション
- `onCompletion`: 補完候補の提供
- `onHover`: ホバー情報の提供

### client/src/extension.ts

VSCode Extensionのエントリーポイント。LSPサーバーを起動し、クライアントとして接続。

## 参考リンク

- [Language Server Protocol Specification](https://microsoft.github.io/language-server-protocol/)
- [VSCode Language Server Extension Guide](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide)
- [vscode-languageserver-node](https://github.com/microsoft/vscode-languageserver-node)

## ライセンス

MIT
