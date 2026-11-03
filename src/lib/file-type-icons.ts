// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: lib/file-type-icons.ts
// Deterministic icons for remote listings, where OS-native file associations are unavailable.
import {
  File,
  FileCode,
  FileCog,
  FileImage,
  FileJson,
  FileLock,
  FileText,
  FileTerminal,
  type LucideIcon
} from 'lucide-react'

const FILE_ICON_BY_NAME: Record<string, LucideIcon> = {
  dockerfile: FileCog,
  makefile: FileTerminal,
  license: FileText,
  readme: FileText,
  '.gitignore': FileLock,
  '.env': FileLock
}

const FILE_ICON_BY_EXTENSION: Record<string, LucideIcon> = {
  ts: FileCode,
  tsx: FileCode,
  js: FileCode,
  jsx: FileCode,
  rs: FileCode,
  go: FileCode,
  py: FileCode,
  rb: FileCode,
  java: FileCode,
  c: FileCode,
  h: FileCode,
  cpp: FileCode,
  css: FileCode,
  html: FileCode,
  json: FileJson,
  jsonc: FileJson,
  yaml: FileJson,
  yml: FileJson,
  toml: FileJson,
  md: FileText,
  txt: FileText,
  log: FileText,
  pdf: FileText,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  gif: FileImage,
  webp: FileImage,
  svg: FileImage,
  sh: FileTerminal,
  bash: FileTerminal,
  zsh: FileTerminal,
  fish: FileTerminal,
  lock: FileLock
}

export function getFileTypeIcon(filePath: string | undefined | null): LucideIcon {
  if (!filePath) {
    return File
  }
  const lastSeparator = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  const filename = (lastSeparator >= 0 ? filePath.slice(lastSeparator + 1) : filePath).toLowerCase()
  if (!filename) {
    return File
  }
  const byName = FILE_ICON_BY_NAME[filename]
  if (byName) {
    return byName
  }
  if (filename.startsWith('.env.')) {
    return FileLock
  }
  const lastDot = filename.lastIndexOf('.')
  if (lastDot <= 0 || lastDot === filename.length - 1) {
    return File
  }
  return FILE_ICON_BY_EXTENSION[filename.slice(lastDot + 1)] ?? File
}
