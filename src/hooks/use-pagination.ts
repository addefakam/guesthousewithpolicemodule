"use client";

import { useState, useMemo, useCallback, useEffect } from "react";

interface UsePaginationOptions {
  /** Total number of items */
  totalItems: number;
  /** Initial page size (default: 5) */
  initialPageSize?: number;
  /** Available page size options (default: [5, 10, 20, 50]) */
  pageSizeOptions?: number[];
}

interface UsePaginationReturn {
  /** Current page index (1-based) */
  currentPage: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of pages */
  totalPages: number;
  /** Available page size options */
  pageSizeOptions: number[];
  /** Go to a specific page (1-based) */
  goToPage: (page: number) => void;
  /** Change the number of items per page (resets to page 1) */
  setPageSize: (size: number) => void;
  /** Update total items count dynamically */
  setTotalItems: (count: number) => void;
  /** Slice an array to the current page items */
  paginate: <T>(items: T[]) => T[];
  /** Current page range info: "Showing X to Y of Z" */
  rangeInfo: { from: number; to: number; total: number };
  /** Reset to page 1 (e.g. when search changes) */
  resetToFirst: () => void;
}

export function usePagination({
  totalItems,
  initialPageSize = 5,
  pageSizeOptions = [5, 10, 20, 50],
}: UsePaginationOptions): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  // Use the prop directly — no separate state to get out of sync.
  // totalPages is derived, so it always reflects the latest count.
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Keep currentPage in valid range when totalItems or pageSize changes.
  // e.g. user was on page 5, list shrank to 2 pages → clamp to page 2.
  // Runs AFTER render, so the derived totalPages is already up to date.
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const rangeInfo = useMemo(() => {
    const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const to = Math.min(currentPage * pageSize, totalItems);
    return { from, to, total: totalItems };
  }, [currentPage, pageSize, totalItems]);

  const goToPage = useCallback(
    (page: number) => {
      // Clamp the target page to the valid range [1, totalPages].
      const clamped = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(clamped);
    },
    [totalPages]
  );

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCurrentPage(1); // Reset to first page on size change
  }, []);

  const resetToFirst = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const setTotalItems = useCallback((_count: number) => {
    // No-op — totalItems is now driven by the prop, not state.
    // Kept for backwards compatibility with callers that use it.
  }, []);

  const paginate = useCallback(
    <T>(items: T[]): T[] => {
      const start = (currentPage - 1) * pageSize;
      // Guard against start being out of range (e.g. when items shrink)
      const safeStart = Math.min(start, Math.max(0, items.length));
      return items.slice(safeStart, safeStart + pageSize);
    },
    [currentPage, pageSize]
  );

  return {
    currentPage,
    pageSize,
    totalPages,
    pageSizeOptions,
    goToPage,
    setPageSize,
    setTotalItems,
    paginate,
    rangeInfo,
    resetToFirst,
  };
}
