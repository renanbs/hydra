// D02a-036/040: the workspace composer keeps itself open behind the nested Add
// Project dialog, and a stale folder path blocks "Create workspace".
import { describe, expect, it, vi, beforeEach } from "vitest"
import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { HydraProject } from "./sidebar/WorktreeSidebar"
import { NewWorkspaceComposer } from "./NewWorkspaceComposer"

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }))
vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }))

const FOLDER_PROJECT: HydraProject = {
  id: "repo_folder",
  name: "notes",
  path: "/work/gone",
  is_git: false,
  current_branch: "main"
}

const GIT_PROJECT: HydraProject = {
  id: "repo_git",
  name: "hydra",
  path: "/repo/hydra",
  is_git: true,
  current_branch: "main"
}

const AGENTS = [{ id: "claude", name: "Claude Code", executable: "claude", is_installed: true }]

function renderComposer(overrides: Record<string, unknown> = {}) {
  const onClose = vi.fn()
  const onOpenAddRepoDialog = vi.fn()
  const view = render(
    <NewWorkspaceComposer
      isOpen
      activeProject={GIT_PROJECT}
      projects={[GIT_PROJECT]}
      availableAgents={AGENTS}
      onClose={onClose}
      onOpenAddRepoDialog={onOpenAddRepoDialog}
      onCreated={vi.fn()}
      {...overrides}
    />
  )
  return { ...view, onClose, onOpenAddRepoDialog }
}

beforeEach(() => {
  invokeMock.mockReset()
  invokeMock.mockResolvedValue(undefined)
})

describe("NewWorkspaceComposer nested Add Project + folder path gate (D02a-036/040)", () => {
  it("opens Add Project without closing the composer", () => {
    const { onOpenAddRepoDialog, onClose } = renderComposer()
    fireEvent.click(screen.getByTitle("Add project"))
    expect(onOpenAddRepoDialog).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })

  it("yields Escape to the nested dialog", () => {
    const { onClose, rerender } = renderComposer({ nestedDialogOpen: true })
    fireEvent.keyDown(window, { key: "Escape" })
    expect(onClose).not.toHaveBeenCalled()

    rerender(
      <NewWorkspaceComposer
        isOpen
        nestedDialogOpen={false}
        activeProject={GIT_PROJECT}
        projects={[GIT_PROJECT]}
        availableAgents={AGENTS}
        onClose={onClose}
        onCreated={vi.fn()}
      />
    )
    fireEvent.keyDown(window, { key: "Escape" })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("blocks Create workspace when the folder path is gone", async () => {
    invokeMock.mockImplementation((command: string) =>
      command === "folder_path_status"
        ? Promise.resolve({ path: "/work/gone", exists: false, reason: "missing" })
        : Promise.resolve(undefined)
    )
    renderComposer({ activeProject: FOLDER_PROJECT, projects: [FOLDER_PROJECT] })

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/Folder not found/i)
    )
    expect(screen.getByRole("button", { name: /Create workspace/i })).toBeDisabled()
  })
})
