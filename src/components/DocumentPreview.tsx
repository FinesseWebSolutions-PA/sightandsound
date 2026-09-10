import { Download, FileText } from "lucide-react";
import { useEffect, useState } from "react";

import { attachmentUrls } from "@/lib/production-data";

/**
 * Shows the actual file for a document revision: images and PDFs render right
 * here, anything else offers to open in a new tab.
 */
export function DocumentPreview({
  storageKey,
  fileLabel,
}: {
  storageKey: string | null;
  fileLabel: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setUrl(null);
    setFailed(false);
    if (!storageKey) return;
    let cancelled = false;
    attachmentUrls([storageKey])
      .then((map) => {
        if (cancelled) return;
        const next = map[storageKey];
        if (next) setUrl(next);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const lower = fileLabel.toLowerCase();
  const isImage = /\.(png|jpe?g|gif|webp|svg|avif)$/.test(lower);
  const isPdf = lower.endsWith(".pdf");

  if (!storageKey || failed) {
    return (
      <div className="flex items-center gap-2 border-b border-border bg-cream-soft px-4 py-6 text-sm text-ink-soft">
        <FileText aria-hidden className="size-4 shrink-0" />
        No file attached to this revision yet.
      </div>
    );
  }

  return (
    <div className="border-b border-border bg-cream-soft">
      {url && isImage && (
        <img src={url} alt={fileLabel} className="max-h-[26rem] w-full object-contain" />
      )}
      {url && isPdf && (
        <iframe src={url} title={fileLabel} className="h-[26rem] w-full border-0 bg-card" />
      )}
      {url && !isImage && !isPdf && (
        <div className="px-4 py-6 text-sm text-ink-soft">
          This file type can&rsquo;t be shown here — open it to view.
        </div>
      )}
      {!url && <div className="px-4 py-6 text-sm text-ink-soft">Loading the file…</div>}
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2.5">
        <span className="min-w-0 flex-1 truncate text-xs text-ink-soft">{fileLabel}</span>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium text-ink hover:bg-cream"
          >
            <Download aria-hidden className="size-4" />
            Open
          </a>
        )}
      </div>
    </div>
  );
}
