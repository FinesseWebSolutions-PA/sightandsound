import type { Approval, DocumentVersion } from "./production-data";
import { approvedDocumentVersions } from "./document-library.ts";
export const instructionCategories = [
  { id: "manual", label: "Operating manuals" },
  { id: "assembly", label: "Assembly & load-in" },
  { id: "shipping", label: "Shipping & packing" },
] as const;
export type InstructionCategory = (typeof instructionCategories)[number]["id"];
export function instructionVersions(
  documentId: string,
  versions: DocumentVersion[],
  approvals: Approval[],
) {
  const sorted = versions
    .filter((v) => v.document_id === documentId)
    .sort((a, b) => b.version - a.version);
  const approved = approvedDocumentVersions(approvals, documentId);
  const latest = sorted[0];
  const lastApproved = sorted.find((v) => approved.includes(v.version));
  return {
    latest,
    lastApproved,
    currentApproved: Boolean(latest && lastApproved?.id === latest.id),
  };
}
