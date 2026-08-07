import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
} from "../constants/pagination";

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface PaginationInput {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type ParsedPagination =
  | {
      ok: true;
      page: number;
      limit: number;
    }
  | {
      ok: false;
    };

function parsePositiveInteger(
  value: string | undefined,
  defaultValue: number
): number | null {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

export function parsePagination(query: PaginationQuery): ParsedPagination {
  const page = parsePositiveInteger(query.page, DEFAULT_PAGE);
  const limit = parsePositiveInteger(query.limit, DEFAULT_LIMIT);

  if (page === null || limit === null) {
    return { ok: false };
  }

  return {
    ok: true,
    page,
    limit: Math.min(limit, MAX_LIMIT),
  };
}

export function normalizePagination(input: PaginationInput = {}) {
  const page = input.page ?? DEFAULT_PAGE;
  const limit = input.limit ?? DEFAULT_LIMIT;

  return {
    page: Math.max(1, Math.floor(page)),
    limit: Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit))),
  };
}

export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
