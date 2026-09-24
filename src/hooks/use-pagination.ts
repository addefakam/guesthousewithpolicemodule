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
  const [totalItemsState, setTotalItemsState] = useState(totalItems);

  // Sync totalItemsState with the prop whenever it changes.
  // This is the fix that makes pagination work when the parent passes
  // a dynamic totalItems value (e.g. filtered.length).
  // We intentionally do NOT reset currentPage here (except to clamp it
  // if it's now out of range) so the user stays on their current page
  // when the list grows or shrinks.
  useEffect(() => {
    setTotalItemsState(totalItems);
  }, [totalItems]);

  const totalPages = Math.max(1, Math.ceil(totalItemsState / pageSize));

  // Keep currentPage in valid range when totalPages changes.
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const rangeInfo = useMemo(() => {
    const from = totalItemsState === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const to = Math.min(currentPage * pageSize, totalItemsState);
    return { from, to, total: totalItemsState };
  }, [currentPage, pageSize, totalItemsState]);

  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(clamped);
    },
    [totalPages]
  );

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCurrentPage(1);
  }, []);

  const resetToFirst = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const setTotalItems = useCallback((count: number) => {
    setTotalItemsState(count);
  }, []);

  const paginate = useCallback(
    <T>(items: T[]): T[] => {
      const start = (currentPage - 1) * pageSize;
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
