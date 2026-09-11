import type { DocumentFolder } from "@/lib/production-data";
import { folderLabel, isFolderDescendant } from "@/lib/document-library";
export function FolderSelect({
  folders,
  value,
  onChange,
  excludeId,
  label = "Folder",
}: {
  folders: DocumentFolder[];
  value: string;
  onChange: (id: string) => void;
  excludeId?: string;
  label?: string;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span>{label}</span>
      <select
        aria-label={label}
        className="min-h-11 w-full rounded-md border border-border bg-card px-3"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Files (top level)</option>
        {folders
          .filter(
            (f) => !f.deleted_at && (!excludeId || !isFolderDescendant(folders, f.id, excludeId)),
          )
          .sort((a, b) => folderLabel(folders, a.id).localeCompare(folderLabel(folders, b.id)))
          .map((f) => (
            <option key={f.id} value={f.id}>
              {folderLabel(folders, f.id)}
            </option>
          ))}
      </select>
    </label>
  );
}
