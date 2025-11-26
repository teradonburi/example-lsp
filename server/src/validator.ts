import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node'
import { parse as parseYaml, YAMLParseError } from 'yaml'

// スキーマ定義（独自形式）
export interface MyConfigSchema {
  name: string // 必須
  version: string // 必須
  enabled?: boolean // オプション
  settings?: {
    timeout?: number
    retries?: number
  }
}

// 必須フィールドの定義
export const REQUIRED_FIELDS = ['name', 'version'] as const

// フィールドのドキュメント
export const FIELD_DOCS: Record<
  string,
  { description: string; type: string; required: boolean }
> = {
  name: {
    description: 'アプリケーションの名前を指定します。',
    type: 'string',
    required: true,
  },
  version: {
    description: 'バージョン番号を指定します（例: "1.0.0"）。',
    type: 'string',
    required: true,
  },
  enabled: {
    description: 'アプリケーションの有効/無効を設定します。',
    type: 'boolean',
    required: false,
  },
  settings: {
    description: '詳細設定オブジェクトです。',
    type: 'object',
    required: false,
  },
  timeout: {
    description: 'タイムアウト時間（秒）を指定します。',
    type: 'number',
    required: false,
  },
  retries: {
    description: 'リトライ回数を指定します。',
    type: 'number',
    required: false,
  },
}

/**
 * キーの行番号を検索するヘルパー
 */
export function findLineForKey(text: string, key: string): number {
  const lines = text.split('\n')
  const regex = new RegExp(`^\\s*${key}\\s*:`)
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      return i
    }
  }
  return 0
}

/**
 * 診断結果を作成するヘルパー
 */
export function createDiagnostic(
  severity: DiagnosticSeverity,
  line: number,
  message: string
): Diagnostic {
  return {
    severity,
    range: {
      start: { line, character: 0 },
      end: { line, character: 1000 },
    },
    message,
    source: 'myconfig-lsp',
  }
}

/**
 * YAMLテキストをパースする
 */
export function parseYamlText(text: string): {
  parsed: unknown
  error: YAMLParseError | null
} {
  try {
    const parsed = parseYaml(text)
    return { parsed, error: null }
  } catch (e) {
    if (e instanceof YAMLParseError) {
      return { parsed: null, error: e }
    }
    throw e
  }
}

/**
 * 設定オブジェクトをバリデートする
 */
export function validateConfig(
  config: Record<string, unknown>,
  text: string
): Diagnostic[] {
  const diagnostics: Diagnostic[] = []

  // 必須フィールドチェック
  for (const field of REQUIRED_FIELDS) {
    if (!(field in config)) {
      diagnostics.push(
        createDiagnostic(
          DiagnosticSeverity.Error,
          0,
          `必須フィールド "${field}" がありません`
        )
      )
    }
  }

  // 型チェック: name
  if ('name' in config && typeof config.name !== 'string') {
    const line = findLineForKey(text, 'name')
    diagnostics.push(
      createDiagnostic(
        DiagnosticSeverity.Error,
        line,
        '"name" は文字列である必要があります'
      )
    )
  }

  // 型チェック: version
  if ('version' in config && typeof config.version !== 'string') {
    const line = findLineForKey(text, 'version')
    diagnostics.push(
      createDiagnostic(
        DiagnosticSeverity.Error,
        line,
        '"version" は文字列である必要があります'
      )
    )
  }

  // 型チェック: enabled
  if ('enabled' in config && typeof config.enabled !== 'boolean') {
    const line = findLineForKey(text, 'enabled')
    diagnostics.push(
      createDiagnostic(
        DiagnosticSeverity.Warning,
        line,
        '"enabled" は真偽値である必要があります（true または false）'
      )
    )
  }

  // settingsのネストされたバリデーション
  if ('settings' in config) {
    const settings = config.settings
    if (typeof settings !== 'object' || settings === null) {
      const line = findLineForKey(text, 'settings')
      diagnostics.push(
        createDiagnostic(
          DiagnosticSeverity.Error,
          line,
          '"settings" はオブジェクトである必要があります'
        )
      )
    } else {
      const s = settings as Record<string, unknown>

      // timeout チェック
      if ('timeout' in s && typeof s.timeout !== 'number') {
        const line = findLineForKey(text, 'timeout')
        diagnostics.push(
          createDiagnostic(
            DiagnosticSeverity.Warning,
            line,
            '"settings.timeout" は数値である必要があります'
          )
        )
      }

      // retries チェック
      if ('retries' in s && typeof s.retries !== 'number') {
        const line = findLineForKey(text, 'retries')
        diagnostics.push(
          createDiagnostic(
            DiagnosticSeverity.Warning,
            line,
            '"settings.retries" は数値である必要があります'
          )
        )
      }

      // retries が負の値の場合
      if ('retries' in s && typeof s.retries === 'number' && s.retries < 0) {
        const line = findLineForKey(text, 'retries')
        diagnostics.push(
          createDiagnostic(
            DiagnosticSeverity.Warning,
            line,
            '"settings.retries" は0以上である必要があります'
          )
        )
      }
    }
  }

  return diagnostics
}

/**
 * テキスト全体をバリデートする
 */
export function validateText(text: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = []

  // 空のファイルはスキップ
  if (text.trim() === '') {
    return diagnostics
  }

  // YAML構文チェック
  const { parsed, error } = parseYamlText(text)

  if (error) {
    const pos = error.linePos?.[0]
    diagnostics.push(
      createDiagnostic(
        DiagnosticSeverity.Error,
        (pos?.line ?? 1) - 1,
        `YAML構文エラー: ${error.message}`
      )
    )
    return diagnostics
  }

  // オブジェクトでない場合（配列も除外）
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    diagnostics.push(
      createDiagnostic(
        DiagnosticSeverity.Error,
        0,
        'ルート要素はオブジェクトである必要があります'
      )
    )
    return diagnostics
  }

  // 設定のバリデーション
  return validateConfig(parsed as Record<string, unknown>, text)
}
