function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 9) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];
  const winStart = Math.max(2, current - 2);
  const winEnd = Math.min(total - 1, current + 2);

  if (winStart > 2) pages.push("...");
  for (let i = winStart; i <= winEnd; i++) pages.push(i);
  if (winEnd < total - 1) pages.push("...");
  pages.push(total);

  return pages;
}

const btnBase =
  "flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-1 text-sm font-medium transition-colors";
const btnIdle = `${btnBase} text-zinc-400 hover:bg-zinc-800 hover:text-white`;
const btnActive = `${btnBase} bg-purple-700/80 text-white ring-1 ring-purple-500/40`;
const btnDisabled = `${btnBase} pointer-events-none cursor-not-allowed opacity-25 text-zinc-500`;
const btnEllipsis = `${btnBase} cursor-default text-zinc-600`;

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (p: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(page, totalPages);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 flex-wrap py-2">
      {/* First */}
      {page > 1 ? (
        <a href={buildHref(1)} className={btnIdle} title="First page">«</a>
      ) : (
        <span className={btnDisabled}>«</span>
      )}

      {/* Prev */}
      {page > 1 ? (
        <a href={buildHref(page - 1)} className={btnIdle} title="Previous page">‹</a>
      ) : (
        <span className={btnDisabled}>‹</span>
      )}

      {/* Page numbers */}
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`el-${i}`} className={btnEllipsis}>…</span>
        ) : (
          <a
            key={p}
            href={buildHref(p)}
            className={p === page ? btnActive : btnIdle}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </a>
        )
      )}

      {/* Next */}
      {page < totalPages ? (
        <a href={buildHref(page + 1)} className={btnIdle} title="Next page">›</a>
      ) : (
        <span className={btnDisabled}>›</span>
      )}

      {/* Last */}
      {page < totalPages ? (
        <a href={buildHref(totalPages)} className={btnIdle} title="Last page">»</a>
      ) : (
        <span className={btnDisabled}>»</span>
      )}
    </nav>
  );
}
