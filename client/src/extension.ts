import * as path from 'path'
import { workspace, ExtensionContext } from 'vscode'
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node'

let client: LanguageClient

export function activate(context: ExtensionContext) {
  // サーバーモジュールのパス
  const serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'))

  // サーバー起動オプション
  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: {
        execArgv: ['--nolazy', '--inspect=6009'],
      },
    },
  }

  // クライアントオプション
  const clientOptions: LanguageClientOptions = {
    // .myconfig ファイルを対象
    documentSelector: [{ scheme: 'file', language: 'myconfig' }],
    synchronize: {
      // 設定ファイルの変更を監視
      fileEvents: workspace.createFileSystemWatcher('**/*.myconfig'),
    },
  }

  // クライアントを作成して起動
  client = new LanguageClient(
    'myconfigLsp',
    'My Config LSP',
    serverOptions,
    clientOptions
  )

  // クライアントを開始
  client.start()
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined
  }
  return client.stop()
}
