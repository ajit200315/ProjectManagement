import Icon from "./Icon.jsx";

/** Renders nothing for a single page, so callers can drop it in anywhere. */
const Pager = ({ pagination, onPage, busy = false }) => {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, total } = pagination;

  return (
    <nav aria-label="Pagination">
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={busy || page <= 1}
      >
        <Icon name="chevronLeft" size={14} /> Previous
      </button>

      <span>
        Page {page} of {totalPages} · {total} total
      </span>

      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={busy || page >= totalPages}
      >
        Next <Icon name="chevronRight" size={14} />
      </button>
    </nav>
  );
};

export default Pager;
