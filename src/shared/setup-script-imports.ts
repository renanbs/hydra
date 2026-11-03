import type { SetupScriptImportProvider } from './setup-script-import-providers'

export type SetupScriptImportCandidate = {
  provider: SetupScriptImportProvider
  label: string
  files: string[]
  setup: string
  archive?: string
  unsupportedFields?: string[]
}

export type SetupScriptImportFileRead = (relativePath: string) => Promise<string | null>
export type SetupScriptImportFileExists = (relativePath: string) => Promise<boolean>
