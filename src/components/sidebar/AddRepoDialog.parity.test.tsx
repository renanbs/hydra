import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { invokeMock, openMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  openMock: vi.fn(),
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: openMock }));

import { AddRepoDialog } from "./AddRepoDialog";
import { useAppStore } from "../../store";
import { DEFAULT_HYDRA_SETTINGS } from "../../shared/settings-types";

function openDialog(onClose = vi.fn()) {
  const ui = (isOpen: boolean) => (
    <AddRepoDialog isOpen={isOpen} onClose={onClose} onProjectAdded={vi.fn()} />
  );
  const view = render(ui(true));
  return { ...view, rerenderOpen: (isOpen: boolean) => view.rerender(ui(isOpen)), onClose };
}

beforeEach(() => {
  invokeMock.mockReset();
  openMock.mockReset();
  invokeMock.mockImplementation((command: string) => {
    if (command === "check_preflight_tools_cmd") {
      return Promise.resolve({ git_installed: true, gh_installed: true, gh_authenticated: true });
    }
    return Promise.resolve(undefined);
  });
  useAppStore.setState({
    settings: { ...DEFAULT_HYDRA_SETTINGS, workspace_dir: "/work/workspaces" },
  });
});

describe("AddRepoDialog workspace defaults (D02a)", () => {
  it("pre-fills the clone destination from the configured workspace directory", async () => {
    openDialog();
    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith("check_preflight_tools_cmd"));

    fireEvent.click(screen.getByText("Clone from URL"));
    // Clone sits beside the workspaces tree (Orca getDefaultCloneParent).
    expect(screen.getByDisplayValue("/work")).toBeInTheDocument();
  });

  it("pre-fills the create location from the configured workspace directory", async () => {
    openDialog();
    fireEvent.click(screen.getByText("Create new project"));
    expect(screen.getByDisplayValue("/work/workspaces")).toBeInTheDocument();
  });

  it("resets a half-typed form when the dialog is reopened", async () => {
    const { rerenderOpen } = openDialog();
    fireEvent.click(screen.getByText("Clone from URL"));
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/github.com/), {
      target: { value: "https://github.com/acme/widgets.git" },
    });

    rerenderOpen(false);
    rerenderOpen(true);
    fireEvent.click(screen.getByText("Clone from URL"));

    expect(screen.getByDisplayValue("")).toBeInTheDocument();
    expect(
      screen.queryByDisplayValue("https://github.com/acme/widgets.git")
    ).toBeNull();
  });

  it("warns and disables clone when git is not installed", async () => {
    invokeMock.mockImplementation((command: string) =>
      command === "check_preflight_tools_cmd"
        ? Promise.resolve({ git_installed: false, gh_installed: false, gh_authenticated: false })
        : Promise.resolve(undefined)
    );
    openDialog();
    await waitFor(() =>
      expect(screen.getByText(/Git is not installed/)).toBeInTheDocument()
    );

    fireEvent.click(screen.getByText("Clone from URL"));
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/github.com/), {
      target: { value: "https://github.com/acme/widgets.git" },
    });
    expect(screen.getByRole("button", { name: "Clone Project" })).toBeDisabled();
  });

  it("submits the clone into the workspace directory", async () => {
    openDialog();
    fireEvent.click(screen.getByText("Clone from URL"));
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/github.com/), {
      target: { value: "https://github.com/acme/widgets.git" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Clone Project" }));

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("clone_project", {
        url: "https://github.com/acme/widgets.git",
        parentDir: "/work",
      })
    );
  });
});
