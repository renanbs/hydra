import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { invokeMock, openMock, toastMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  openMock: vi.fn(),
  toastMock: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() }
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: openMock }));
vi.mock("sonner", () => ({ toast: toastMock }));

import { AddRepoDialog, type AddRepoProjectAddedKind } from "./AddRepoDialog";
import { useAppStore } from "../../store";
import { DEFAULT_HYDRA_SETTINGS } from "../../shared/settings-types";

type Entry = { name: string; path: string; is_dir: boolean; is_hidden: boolean };

function dir(name: string, base: string): Entry {
  return { name, path: `${base}/${name}`, is_dir: true, is_hidden: name.startsWith(".") };
}

const TREE: Record<string, Entry[]> = {
  "/work/workspaces": [],
  "/a": [dir(".git", "/a")],
  "/b": [dir("api", "/b"), dir("web", "/b")],
  "/b/api": [dir(".git", "/b/api")],
  "/b/web": [dir(".git", "/b/web")],
  "/acme": [dir("api", "/acme"), dir("web", "/acme")],
  "/acme/api": [dir(".git", "/acme/api")],
  "/acme/web": [dir(".git", "/acme/web")]
};

function openDialog(
  onClose = vi.fn(),
  onProjectAdded = vi.fn<(path?: string, kind?: AddRepoProjectAddedKind) => void>(),
  initialFolderPath: string | null = null
) {
  const ui = (isOpen: boolean) => (
    <AddRepoDialog
      isOpen={isOpen}
      initialFolderPath={initialFolderPath}
      onClose={onClose}
      onProjectAdded={onProjectAdded}
    />
  );
  const view = render(ui(true));
  return { ...view, rerenderOpen: (isOpen: boolean) => view.rerender(ui(isOpen)), onClose, onProjectAdded };
}

beforeEach(() => {
  invokeMock.mockReset();
  openMock.mockReset();
  toastMock.info.mockReset();
  toastMock.success.mockReset();
  toastMock.warning.mockReset();
  toastMock.error.mockReset();
  invokeMock.mockImplementation((command: string, args?: { path?: string }) => {
    if (command === "check_preflight_tools_cmd") {
      return Promise.resolve({ git_installed: true, gh_installed: true, gh_authenticated: true });
    }
    if (command === "list_directory_cmd") {
      const entries = TREE[args?.path ?? ""];
      return entries ? Promise.resolve({ path: args?.path, entries }) : Promise.reject(new Error("missing"));
    }
    if (command === "is_git_repository") {
      return Promise.resolve(args?.path === "/a" || Boolean(args?.path));
    }
    if (command === "catalog_add_folder") {
      return Promise.resolve({ schemaVersion: 1, projectGroups: [], folderWorkspaces: [], repos: [] });
    }
    if (command === "import_nested_repos") {
      const paths = (args as { paths?: string[] })?.paths ?? [];
      return Promise.resolve({ added: paths, skipped: [] });
    }
    if (command === "clone_project") return Promise.resolve("/work/widgets");
    if (command === "create_project") return Promise.resolve("/work/projects/demo");
    return Promise.resolve(undefined);
  });
  useAppStore.setState({
    settings: { ...DEFAULT_HYDRA_SETTINGS, workspace_dir: "/work/workspaces" },
    sshTargetLabels: new Map(),
    sshConnectionStates: new Map(),
    runtimeEnvironments: [],
    runtimeStatusByEnvironmentId: new Map()
  });
});

describe("AddRepoDialog workspace defaults (D02a)", () => {
  it("pre-fills the clone destination from the configured workspace directory", async () => {
    openDialog();
    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith("check_preflight_tools_cmd"));

    fireEvent.click(screen.getByText("Clone from URL"));
    expect(screen.getByDisplayValue("/work")).toBeInTheDocument();
  });

  it("pre-fills the create location from the configured workspace directory", async () => {
    openDialog();
    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith("check_preflight_tools_cmd"));
    fireEvent.click(screen.getByText("Create new project"));
    fireEvent.click(screen.getByRole("button", { name: /Git repository in/i }));
    expect(screen.getByTitle("/work/workspaces")).toBeInTheDocument();
  });

  it("resets a half-typed form when the dialog is reopened", async () => {
    const { rerenderOpen } = openDialog();
    fireEvent.click(screen.getByText("Clone from URL"));
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/github.com/), {
      target: { value: "https://github.com/acme/widgets.git" }
    });

    rerenderOpen(false);
    rerenderOpen(true);
    fireEvent.click(screen.getByText("Clone from URL"));

    expect(screen.getByDisplayValue("")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("https://github.com/acme/widgets.git")).toBeNull();
  });

  it("warns and disables clone when git is not installed", async () => {
    invokeMock.mockImplementation((command: string) =>
      command === "check_preflight_tools_cmd"
        ? Promise.resolve({ git_installed: false, gh_installed: false, gh_authenticated: false })
        : Promise.resolve(undefined)
    );
    openDialog();
    await waitFor(() => expect(screen.getByText(/Git is not installed/)).toBeInTheDocument());

    fireEvent.click(screen.getByText("Clone from URL"));
    await waitFor(() =>
      expect(screen.getByText(/Git is not installed/)).toBeInTheDocument()
    );
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/github.com/), {
      target: { value: "https://github.com/acme/widgets.git" }
    });
    expect(screen.getByRole("button", { name: "Clone Project" })).toBeDisabled();
  });

  it("submits the clone into the workspace directory and selects the added project", async () => {
    const { onProjectAdded, onClose } = openDialog();
    fireEvent.click(screen.getByText("Clone from URL"));
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/github.com/), {
      target: { value: "https://github.com/acme/widgets.git" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Clone Project" }));

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith(
        "clone_project",
        expect.objectContaining({
          url: "https://github.com/acme/widgets.git",
          parentDir: "/work",
          // The cancel handle is generated per attempt (D02a-001).
          cloneId: expect.stringMatching(/^clone-\d+-/)
        })
      )
    );
    await waitFor(() =>
      expect(onProjectAdded).toHaveBeenCalledWith("/work/widgets", "project")
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("creates a project, toasts and selects it", async () => {
    const { onProjectAdded } = openDialog();
    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith("check_preflight_tools_cmd"));
    fireEvent.click(screen.getByText("Create new project"));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "demo" } });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Create Project" })).toBeEnabled()
    );
    fireEvent.click(screen.getByRole("button", { name: "Create Project" }));

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("create_project", {
        name: "demo",
        parentDir: "/work/workspaces",
        initGit: true
      })
    );
    await waitFor(() =>
      expect(onProjectAdded).toHaveBeenCalledWith("/work/projects/demo", "project")
    );
    expect(toastMock.success).toHaveBeenCalledWith("Project created");
  });

  it("adds a dropped git folder after the confirmation step", async () => {
    const { onProjectAdded } = openDialog(vi.fn(), vi.fn(), "/a");
    expect(screen.getByText("/a")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add Project" }));

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("catalog_add_folder", { path: "/a" })
    );
    await waitFor(() => expect(onProjectAdded).toHaveBeenCalledWith("/a", "project"));
  });

  it("routes a dropped non-git folder through the non-git confirmation", async () => {
    invokeMock.mockImplementation((command: string, args?: { path?: string }) => {
      if (command === "check_preflight_tools_cmd") {
        return Promise.resolve({ git_installed: true });
      }
      if (command === "is_git_repository") return Promise.resolve(false);
      if (command === "catalog_add_folder") {
        return Promise.resolve({ schemaVersion: 1, projectGroups: [], folderWorkspaces: [], repos: [] });
      }
      return Promise.resolve(undefined);
    });
    openDialog(vi.fn(), vi.fn(), "/b");
    fireEvent.click(screen.getByRole("button", { name: "Add Project" }));
    await waitFor(() =>
      expect(screen.getByText("Not a Git repository")).toBeInTheDocument()
    );
  });

  it("scans a folder with nested repositories and imports the selection separately", async () => {
    openMock.mockResolvedValue(["/acme"]);
    const { onProjectAdded } = openDialog();
    fireEvent.click(screen.getByRole("button", { name: /browse folder/i }));

    await waitFor(() =>
      expect(screen.getByText("Found 2 repositories in /acme.")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /import separately/i }));

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("import_nested_repos", {
        paths: ["/acme/api", "/acme/web"],
        groupName: null
      })
    );
    await waitFor(() =>
      expect(onProjectAdded).toHaveBeenCalledWith("/acme/api", "project")
    );
  });

  it("imports the whole scanned folder as a group", async () => {
    openMock.mockResolvedValue(["/acme"]);
    const { onProjectAdded } = openDialog();
    fireEvent.click(screen.getByRole("button", { name: /browse folder/i }));
    await waitFor(() =>
      expect(screen.getByText("Found 2 repositories in /acme.")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /import as group/i }));

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("import_nested_repos", {
        paths: ["/acme/api", "/acme/web"],
        groupName: "acme"
      })
    );
    // The group import adds repositories, so the first one is what gets selected.
    await waitFor(() => expect(onProjectAdded).toHaveBeenCalledWith("/acme/api", "project"));
    expect(toastMock.success).toHaveBeenCalledWith("Group imported");
  });

  it("skips complex folders in a multi-folder batch and adds the simple one", async () => {
    openMock.mockResolvedValue(["/a", "/b"]);
    const { onProjectAdded } = openDialog();
    fireEvent.click(screen.getByRole("button", { name: /browse folder/i }));

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("catalog_add_folder", { path: "/a" })
    );
    expect(invokeMock).not.toHaveBeenCalledWith("catalog_add_folder", { path: "/b" });
    await waitFor(() =>
      expect(toastMock.info).toHaveBeenCalledWith(
        "Some folders were skipped",
        expect.anything()
      )
    );
    await waitFor(() => expect(onProjectAdded).toHaveBeenCalledWith("/a", "project"));
  });
});

describe("AddRepoDialog on an SSH host (D02a/D02b-022)", () => {
  function useSshHost(): void {
    useAppStore.setState({
      settings: { ...DEFAULT_HYDRA_SETTINGS, workspace_dir: "/work/workspaces" },
      sshTargetLabels: new Map([["srv", "build-box"]]),
      sshConnectionStates: new Map([["srv", { status: "connected" }]]),
      runtimeEnvironments: [],
      runtimeStatusByEnvironmentId: new Map()
    });
  }

  async function selectSshHost(): Promise<void> {
    fireEvent.click(screen.getByRole("button", { name: /local linux/i }));
    fireEvent.click(await screen.findByRole("option", { name: /build-box/i }));
  }

  it("clones on the host and registers the remote project row with its host stamps", async () => {
    useSshHost();
    invokeMock.mockImplementation((command: string) => {
      if (command === "check_preflight_tools_cmd") {
        return Promise.resolve({ git_installed: true, gh_installed: true, gh_authenticated: true });
      }
      if (command === "ssh_remote_clone") {
        return Promise.resolve({ path: "/srv/code/widgets" });
      }
      if (command === "catalog_add_remote_repo") {
        return Promise.resolve({ schemaVersion: 1, projectGroups: [], folderWorkspaces: [], repos: [] });
      }
      return Promise.resolve(undefined);
    });
    const { onProjectAdded } = openDialog();
    await selectSshHost();
    fireEvent.click(screen.getByText("Clone from URL"));
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/github.com/), {
      target: { value: "https://github.com/acme/widgets.git" }
    });
    fireEvent.change(screen.getByLabelText("Destination Directory"), {
      target: { value: "/srv/code" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Clone Project" }));

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("ssh_remote_clone", {
        connectionId: "srv",
        url: "https://github.com/acme/widgets.git",
        destination: "/srv/code",
        name: null
      })
    );
    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("catalog_add_remote_repo", {
        path: "/srv/code/widgets",
        connectionId: "srv",
        executionHostId: "ssh:srv",
        kind: "git",
        displayName: null
      })
    );
    await waitFor(() =>
      expect(onProjectAdded).toHaveBeenCalledWith("/srv/code/widgets", "project")
    );
  });

  it("browses the host to fill the clone destination (D02b-022)", async () => {
    useSshHost();
    invokeMock.mockImplementation((command: string) => {
      if (command === "check_preflight_tools_cmd") {
        return Promise.resolve({ git_installed: true, gh_installed: true, gh_authenticated: true });
      }
      if (command === "ssh_browse_dir") {
        return Promise.resolve({
          resolvedPath: "/srv",
          entries: [{ name: "code", path: "/srv/code", kind: "dir" }]
        });
      }
      return Promise.resolve(undefined);
    });
    openDialog();
    await selectSshHost();
    fireEvent.click(screen.getByText("Clone from URL"));
    fireEvent.click(screen.getByRole("button", { name: "Pick a host folder" }));

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("ssh_browse_dir", {
        connectionId: "srv",
        path: "~"
      })
    );
    expect(await screen.findByText(/Clone destination on build-box/)).toBeInTheDocument();
    // Double-click opens + selects the folder in one gesture (Orca behavior).
    fireEvent.doubleClick(await screen.findByRole("button", { name: /code/ }));
    await waitFor(() =>
      expect(screen.getByLabelText("Destination Directory")).toHaveValue("/srv/code")
    );
  });

  it("creates the project on the host and registers it", async () => {
    useSshHost();
    invokeMock.mockImplementation((command: string) => {
      if (command === "check_preflight_tools_cmd") {
        return Promise.resolve({ git_installed: true, gh_installed: true, gh_authenticated: true });
      }
      if (command === "ssh_remote_create_project") {
        return Promise.resolve({ path: "/srv/projects/demo" });
      }
      if (command === "catalog_add_remote_repo") {
        return Promise.resolve({ schemaVersion: 1, projectGroups: [], folderWorkspaces: [], repos: [] });
      }
      return Promise.resolve(undefined);
    });
    const { onProjectAdded } = openDialog();
    await selectSshHost();
    fireEvent.click(screen.getByText("Create new project"));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "demo" } });
    fireEvent.change(screen.getByLabelText("Host parent folder"), {
      target: { value: "/srv/projects" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Project" }));

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("ssh_remote_create_project", {
        connectionId: "srv",
        path: "/srv/projects",
        name: "demo",
        initGit: true
      })
    );
    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith(
        "catalog_add_remote_repo",
        expect.objectContaining({ path: "/srv/projects/demo", connectionId: "srv" })
      )
    );
    await waitFor(() =>
      expect(onProjectAdded).toHaveBeenCalledWith("/srv/projects/demo", "project")
    );
  });

  it("cancels a running local clone through clone_abort (D02a-001)", async () => {
    invokeMock.mockImplementation((command: string) => {
      if (command === "check_preflight_tools_cmd") {
        return Promise.resolve({ git_installed: true, gh_installed: true, gh_authenticated: true });
      }
      if (command === "clone_project") {
        // Never settles: the cancel path must not wait for the clone promise.
        return new Promise(() => {});
      }
      if (command === "clone_abort") {
        return Promise.resolve({ cloneId: "x", found: true, cancelled: true });
      }
      return Promise.resolve(undefined);
    });
    openDialog();
    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith("check_preflight_tools_cmd"));
    fireEvent.click(screen.getByText("Clone from URL"));
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/github.com/), {
      target: { value: "https://github.com/acme/widgets.git" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Clone Project" }));

    const cloneCall = await waitFor(() => {
      const call = invokeMock.mock.calls.find(([command]) => command === "clone_project");
      expect(call).toBeTruthy();
      return call as [string, { cloneId: string }];
    });
    fireEvent.click(await screen.findByRole("button", { name: "Cancel clone" }));

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("clone_abort", {
        cloneId: cloneCall[1].cloneId
      })
    );
  });
});
