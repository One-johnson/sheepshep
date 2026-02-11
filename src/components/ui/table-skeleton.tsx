"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TableSkeletonProps {
  /**
   * Number of columns to show in the skeleton
   * @default 5
   */
  columns?: number;
  /**
   * Number of rows to show in the skeleton
   * @default 5
   */
  rows?: number;
  /**
   * Whether to show a checkbox column (for row selection)
   * @default false
   */
  showCheckbox?: boolean;
  /**
   * Whether to show the search bar skeleton
   * @default true
   */
  showSearch?: boolean;
  /**
   * Whether to show the action buttons skeleton
   * @default true
   */
  showActions?: boolean;
}

export function TableSkeleton({
  columns = 5,
  rows = 5,
  showCheckbox = false,
  showSearch = true,
  showActions = true,
}: TableSkeletonProps) {
  return (
    <div className="space-y-4">
      {/* Search and Actions Bar */}
      {(showSearch || showActions) && (
        <div className="flex items-center justify-between gap-4">
          {showSearch && (
            <Skeleton className="h-10 w-full max-w-sm" />
          )}
          {showActions && (
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-24" />
            </div>
          )}
        </div>
      )}

      {/* Table Skeleton */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {showCheckbox && (
                <TableHead className="w-12">
                  <Skeleton className="h-4 w-4" />
                </TableHead>
              )}
              {Array.from({ length: columns }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-24" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {showCheckbox && (
                  <TableCell className="w-12">
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                )}
                {Array.from({ length: columns }).map((_, colIndex) => {
                  // Deterministic width based on row and column index to avoid hydration mismatch
                  // Using a simple hash-like function for consistent widths
                  const widthSeed = (rowIndex * columns + colIndex) % 7;
                  const widths = [65, 75, 85, 70, 80, 90, 68];
                  const width = widths[widthSeed];
                  
                  return (
                    <TableCell key={colIndex}>
                      <Skeleton
                        className="h-4"
                        style={{
                          width: `${width}%`,
                        }}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Skeleton */}
      <div className="flex items-center justify-between px-2">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}
