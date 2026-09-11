import type { DocumentFolder } from "./production-data";
export function folderTrail(folders: DocumentFolder[], id: string | null): DocumentFolder[] {
  const trail: DocumentFolder[] = [];
  const seen = new Set<string>();
  let current = folders.find((f) => f.id === id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    trail.unshift(current);
    current = folders.find((f) => f.id === current!.parent_id);
  }
  return trail;
}
export function folderLabel(folders: DocumentFolder[], id: string | null) {
  return (
    folderTrail(folders, id)
      .map((f) => f.name)
      .join(" / ") || "Files"
  );
}
export function isFolderDescendant(folders: DocumentFolder[], id: string, parentId: string) {
  return folderTrail(folders, id).some((f) => f.id === parentId);
}

import type { Approval } from "./production-data";
export function latestVersionReview(approvals: Approval[], documentId: string, version: number) {
  return approvals
    .filter((a) => a.document_id === documentId && a.version === version)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}
export function approvedDocumentVersions(approvals: Approval[], documentId: string) {
  return [...new Set(approvals.filter((a) => a.document_id === documentId).map((a) => a.version))]
    .filter(
      (version) => latestVersionReview(approvals, documentId, version)?.decision === "approved",
    )
    .sort((a, b) => b - a);
}
