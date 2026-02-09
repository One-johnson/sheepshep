"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardSkeletonProps {
  /**
   * Number of skeleton cards to show
   * @default 4
   */
  count?: number;
  /**
   * Whether to show description text skeleton
   * @default true
   */
  showDescription?: boolean;
}

/**
 * Skeleton component for stats cards (typically used in grids)
 */
export function StatsCardSkeleton({ count = 4, showDescription = true }: StatsCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            {showDescription && <Skeleton className="h-3 w-32" />}
          </CardContent>
        </Card>
      ))}
    </>
  );
}

interface CardSkeletonProps {
  /**
   * Whether to show description skeleton
   * @default true
   */
  showDescription?: boolean;
  /**
   * Height of the content area skeleton
   * @default "h-32"
   */
  contentHeight?: string;
}

/**
 * Generic card skeleton component
 */
export function CardSkeleton({ showDescription = true, contentHeight = "h-32" }: CardSkeletonProps) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48 mb-2" />
        {showDescription && <Skeleton className="h-4 w-64" />}
      </CardHeader>
      <CardContent>
        <Skeleton className={`${contentHeight} w-full`} />
      </CardContent>
    </Card>
  );
}

interface ChartCardSkeletonProps {
  /**
   * Height of the chart skeleton
   * @default "h-[300px]"
   */
  height?: string;
}

/**
 * Skeleton component for chart cards
 */
export function ChartCardSkeleton({ height = "h-[300px]" }: ChartCardSkeletonProps) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className={`${height} w-full`} />
      </CardContent>
    </Card>
  );
}

interface ListCardSkeletonProps {
  /**
   * Number of list items to show
   * @default 3
   */
  items?: number;
  /**
   * Height of each list item
   * @default "h-12"
   */
  itemHeight?: string;
}

/**
 * Skeleton component for list cards (like Quick Stats)
 */
export function ListCardSkeleton({ items = 3, itemHeight = "h-12" }: ListCardSkeletonProps) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: items }).map((_, i) => (
          <Skeleton key={i} className={`${itemHeight} w-full`} />
        ))}
      </CardContent>
    </Card>
  );
}
