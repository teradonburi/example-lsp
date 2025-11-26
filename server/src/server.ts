import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  CompletionItem,
  CompletionItemKind,
  Hover,
  MarkupKind,
} from 'vscode-languageserver/node'

import { TextDocument } from 'vscode-languageserver-textdocument'
import { validateText, FIELD_DOCS } from './validator'

// サーバー接続を作成
const connection = createConnection(ProposedFeatures.all)

// ドキュメント管理
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)

// 初期化ハンドラ
connection.onInitialize((params: InitializeParams): InitializeResult => {
  connection.console.log('My Config LSP Server initializing...')

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // 補完機能を有効化
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: [':', ' '],
      },
      // ホバー機能を有効化
      hoverProvider: true,
    },
  }
})

connection.onInitialized(() => {
  connection.console.log('My Config LSP Server initialized!')
})

// ドキュメント変更時のバリデーション
documents.onDidChangeContent(change => {
  const text = change.document.getText()
  const diagnostics = validateText(text)
  connection.sendDiagnostics({ uri: change.document.uri, diagnostics })
})

// 補完ハンドラ
connection.onCompletion((textDocumentPosition): CompletionItem[] => {
  const document = documents.get(textDocumentPosition.textDocument.uri)
  if (!document) return []

  const text = document.getText()
  const position = textDocumentPosition.position
  const lines = text.split('\n')
  const currentLine = lines[position.line] || ''

  // インデントレベルを判定
  const indentMatch = currentLine.match(/^(\s*)/)
  const indent = indentMatch ? indentMatch[1].length : 0

  // settingsの中にいる場合（インデントが2以上）
  if (indent >= 2) {
    return [
      {
        label: 'timeout',
        kind: CompletionItemKind.Property,
        detail: '(number) タイムアウト時間',
        documentation: 'タイムアウト時間（秒）を指定します。',
        insertText: 'timeout: ',
      },
      {
        label: 'retries',
        kind: CompletionItemKind.Property,
        detail: '(number) リトライ回数',
        documentation: 'リトライ回数を指定します。',
        insertText: 'retries: ',
      },
    ]
  }

  // トップレベルの補完
  return [
    {
      label: 'name',
      kind: CompletionItemKind.Property,
      detail: '(必須) アプリケーション名',
      documentation: 'アプリケーションの名前を指定します。',
      insertText: 'name: ',
    },
    {
      label: 'version',
      kind: CompletionItemKind.Property,
      detail: '(必須) バージョン',
      documentation: 'バージョン番号を指定します（例: "1.0.0"）。',
      insertText: 'version: ',
    },
    {
      label: 'enabled',
      kind: CompletionItemKind.Property,
      detail: '(boolean) 有効/無効',
      documentation: 'アプリケーションの有効/無効を設定します。',
      insertText: 'enabled: ',
    },
    {
      label: 'settings',
      kind: CompletionItemKind.Property,
      detail: '(object) 詳細設定',
      documentation: '詳細設定オブジェクトです。',
      insertText: 'settings:\n  ',
    },
  ]
})

// 補完アイテムの詳細情報
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  return item
})

// ホバーハンドラ
connection.onHover((params): Hover | null => {
  const document = documents.get(params.textDocument.uri)
  if (!document) return null

  const text = document.getText()
  const position = params.position
  const lines = text.split('\n')
  const line = lines[position.line]

  if (!line) return null

  // キーを抽出
  const keyMatch = line.match(/^\s*(\w+)\s*:/)
  if (!keyMatch) return null

  const key = keyMatch[1]
  const doc = FIELD_DOCS[key]

  if (!doc) return null

  const requiredText = doc.required ? '**必須**' : 'オプション'

  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: [`**${key}** (${doc.type}) - ${requiredText}`, '', doc.description].join(
        '\n'
      ),
    },
  }
})

// ドキュメント管理をサーバーに接続
documents.listen(connection)

// サーバーを開始
connection.listen()
