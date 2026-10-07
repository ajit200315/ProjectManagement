/** Renders nothing for a single page, so callers can drop it in anywhere. */
const Pager = ({ pagination, onPage, busy = false }) => {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, total } = pagination;

  return (
    <nav className="pager" aria-label="Pagination">
      <button
        type="button"
        className="ghost small"
        onClick={() => onPage(page - 1)}
        disabled={busy || page <= 1}
      >
        ← Previous
      </button>

      <span className="muted small">
        Page {page} of {totalPages} · {total} total
      </span>

      <button
        type="button"
        className="ghost small"
        onClick={() => onPage(page + 1)}
        disabled={busy || page >= totalPages}
      >
        Next →
      </button>
    </nav>
  );
};

export default Pager;
