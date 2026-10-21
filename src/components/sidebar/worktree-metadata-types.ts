// Wire shape of `worktree_metadata` (Rust `WorktreeMetadataRecord` serializes its
// snake_case fields, like the rest of the DB records).
export type WorktreeMetadataRecord = {
  worktree_path: string;
  display_name: string | null;
  first_agent_message_rename_error: string | null;
  status: string | null;
  created_at: number | null;
  created_with_agent: string | null;
  provenance_kind: string | null;
  is_pinned: boolean | null;
  is_unread: boolean | null;
  comment: string | null;
  linked_issue: number | null;
  linked_pr: number | null;
  linked_linear_issue: string | null;
  updated_at: number;
};

export type WorktreeMetadataByPath = Readonly<Record<string, WorktreeMetadataRecord>>;

/** The four editable workspace metadata fields (Orca `WorktreeMeta`). */
export type WorktreeMetadataDraft = {
  displayName: string;
  comment: string;
  linkedIssue: number | null;
  linkedPR: number | null;
  linkedLinearIssue: string | null;
};
