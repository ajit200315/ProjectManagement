import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from "./constant.js";

/**
 * Reads ?page and ?limit off a request.
 *
 * Clamped rather than validated: a nonsense page size is not worth failing a
 * read over, but an unbounded one lets a caller ask for the whole collection
 * in a single query.
 */
export const getPagination = (query = {}) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const requested = Number.parseInt(query.limit, 10) || DEFAULT_PAGE_LIMIT;
  const limit = Math.min(Math.max(1, requested), MAX_PAGE_LIMIT);

  return { page, limit, skip: (page - 1) * limit };
};

/**
 * Wraps a page of results with what a client needs to render a pager, so every
 * list endpoint returns the same shape.
 */
export const paginated = (items, { page, limit }, total) => ({
  items,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    hasMore: page * limit < total,
  },
});
