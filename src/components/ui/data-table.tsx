"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  RowSelectionState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Table as TanStackTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  EyeOff,
  Filter,
  X,
  Inbox,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  enableColumnVisibility?: boolean;
  enablePagination?: boolean;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  className?: string;
  emptyMessage?: string;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  enableRowSelection?: boolean;
  onRowSelectionChange?: (selectedRows: TData[]) => void;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  enableColumnVisibility = true,
  enablePagination = true,
  enableSorting = true,
  enableFiltering = true,
  pageSize = 10,
  pageSizeOptions = [10, 20, 30, 50, 100],
  className,
  emptyMessage = "No results found.",
  emptyIcon: EmptyIcon = Inbox,
  enableRowSelection = false,
  onRowSelectionChange,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [openRows, setOpenRows] = React.useState<Record<string, boolean>>({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    onSortingChange: enableSorting ? setSorting : undefined,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    onColumnFiltersChange: enableFiltering ? setColumnFilters : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    onColumnVisibilityChange: enableColumnVisibility ? setColumnVisibility : undefined,
    onRowSelectionChange: enableRowSelection ? setRowSelection : undefined,
    onGlobalFilterChange: enableFiltering && !searchKey ? setGlobalFilter : undefined,
    enableRowSelection: enableRowSelection,
    globalFilterFn: "includesString",
    state: {
      sorting: enableSorting ? sorting : undefined,
      columnFilters: enableFiltering ? columnFilters : undefined,
      columnVisibility: enableColumnVisibility ? columnVisibility : undefined,
      rowSelection: enableRowSelection ? rowSelection : undefined,
      globalFilter: enableFiltering && !searchKey ? globalFilter : undefined,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  // Notify parent of row selection changes
  React.useEffect(() => {
    if (enableRowSelection && onRowSelectionChange) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);
      onRowSelectionChange(selectedRows);
    }
  }, [rowSelection, enableRowSelection, onRowSelectionChange, table]);

  // If searchKey is provided, filter that specific column instead of global filter
  React.useEffect(() => {
    if (searchKey && enableFiltering) {
      const column = table.getColumn(searchKey);
      if (column) {
        column.setFilterValue(globalFilter || undefined);
      }
    }
  }, [globalFilter, searchKey, enableFiltering, table]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        {/* Search */}
        {enableFiltering && searchKey && (
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Input
                placeholder={searchPlaceholder}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="h-9"
              />
              {globalFilter && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 h-7 w-7"
                  onClick={() => setGlobalFilter("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {columnFilters.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setColumnFilters([]);
                  setGlobalFilter("");
                }}
                className="h-9"
              >
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {/* Column Visibility */}
        {enableColumnVisibility && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto h-9">
                <Eye className="mr-2 h-4 w-4" />
                Columns
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="rounded-md border hidden md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {enableRowSelection && (
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={table.getIsAllPageRowsSelected()}
                      onChange={(e) => {
                        if (e.target.checked) {
                          table.toggleAllPageRowsSelected(true);
                        } else {
                          table.toggleAllPageRowsSelected(false);
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-10">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    onRowClick && !enableRowSelection ? "cursor-pointer" : "",
                    row.getIsSelected() && "bg-muted/50"
                  )}
                  onClick={() => {
                    if (!enableRowSelection && onRowClick) {
                      onRowClick(row.original);
                    }
                  }}
                >
                  {enableRowSelection && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={row.getIsSelected()}
                        onChange={(e) => {
                          e.stopPropagation();
                          row.toggleSelected(e.target.checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-gray-300"
                        aria-label="Select row"
                      />
                    </TableCell>
                  )}
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + (enableRowSelection ? 1 : 0)} className="h-96">
                  <div className="flex flex-col items-center justify-center h-full py-12 px-4">
                    <div className="relative mb-4">
                      <div className="absolute inset-0 bg-muted/20 rounded-full blur-xl animate-pulse" />
                      <div className="relative bg-muted/50 rounded-full p-6 backdrop-blur-sm">
                        <EmptyIcon className="h-12 w-12 text-muted-foreground/60" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {emptyMessage}
                    </h3>
                    <p className="text-sm text-muted-foreground text-center max-w-sm">
                      {globalFilter || columnFilters.length > 0
                        ? "Try adjusting your filters to see more results"
                        : "No data available at the moment"}
                    </p>
                    {(globalFilter || columnFilters.length > 0) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => {
                          setGlobalFilter("");
                          setColumnFilters([]);
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Clear filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Collapsible Card View */}
      <div className="space-y-2 md:hidden">
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => {
            const visibleCells = row.getVisibleCells();
            const firstCell = visibleCells[0];
            const otherCells = visibleCells.slice(1);
            const isOpen = openRows[row.id] || false;

            return (
              <Collapsible
                key={row.id}
                open={isOpen}
                onOpenChange={(open) => {
                  setOpenRows((prev) => ({ ...prev, [row.id]: open }));
                }}
                className="rounded-lg border bg-card"
              >
                <CollapsibleTrigger
                  className={cn(
                    "w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors",
                    row.getIsSelected() && "bg-muted/50"
                  )}
                  onClick={(e) => {
                    if (enableRowSelection) {
                      e.stopPropagation();
                    }
                  }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {enableRowSelection && (
                      <input
                        type="checkbox"
                        checked={row.getIsSelected()}
                        onChange={(e) => {
                          e.stopPropagation();
                          row.toggleSelected(e.target.checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-gray-300 shrink-0"
                        aria-label="Select row"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      {firstCell && (
                        <div className="truncate">
                          {flexRender(firstCell.column.columnDef.cell, firstCell.getContext())}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-muted-foreground shrink-0 transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-3">
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    {otherCells.map((cell) => {
                      const header = cell.column.columnDef.header;
                      const headerText =
                        typeof header === "string"
                          ? header
                          : cell.column.id
                              .split(/(?=[A-Z])/)
                              .join(" ")
                              .toLowerCase()
                              .replace(/^\w/, (c) => c.toUpperCase());

                      return (
                        <div key={cell.id} className="space-y-1">
                          <div className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {headerText}
                          </div>
                          <div className="text-xs sm:text-sm">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })
        ) : (
          <div className="rounded-lg border bg-card p-8">
            <div className="flex flex-col items-center justify-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-muted/20 rounded-full blur-xl animate-pulse" />
                <div className="relative bg-muted/50 rounded-full p-6 backdrop-blur-sm">
                  <EmptyIcon className="h-12 w-12 text-muted-foreground/60" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {emptyMessage}
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {globalFilter || columnFilters.length > 0
                  ? "Try adjusting your filters to see more results"
                  : "No data available at the moment"}
              </p>
              {(globalFilter || columnFilters.length > 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setGlobalFilter("");
                    setColumnFilters([]);
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {enablePagination && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-2 py-2">
          <div className="flex-1 text-xs sm:text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length > 0 && (
              <>
                <span className="hidden sm:inline">
                  Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                    table.getFilteredRowModel().rows.length
                  )}{" "}
                  of {table.getFilteredRowModel().rows.length} entries
                </span>
                <span className="sm:hidden">
                  {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-{Math.min(
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                    table.getFilteredRowModel().rows.length
                  )} of {table.getFilteredRowModel().rows.length}
                </span>
              </>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex items-center gap-2 justify-between sm:justify-start">
              <p className="text-xs sm:text-sm font-medium hidden sm:inline">Rows per page</p>
              <p className="text-xs sm:text-sm font-medium sm:hidden">Per page</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs sm:text-sm">
                    {table.getState().pagination.pageSize}
                    <ChevronDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {pageSizeOptions.map((size) => (
                    <DropdownMenuCheckboxItem
                      key={size}
                      checked={table.getState().pagination.pageSize === size}
                      onCheckedChange={() => {
                        table.setPageSize(size);
                      }}
                      className="text-xs sm:text-sm"
                    >
                      {size}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-1 justify-center sm:justify-start">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <div className="flex items-center justify-center text-xs sm:text-sm font-medium w-12 sm:w-12">
                {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for sortable column headers
export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: {
  column: ReturnType<TanStackTable<TData>["getColumn"]>;
  title: string;
  className?: string;
}) {
  if (!column || !column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  // Store column reference to ensure TypeScript knows it's defined in closures
  const columnRef = column;
  const isSorted = columnRef.getIsSorted();

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => columnRef.toggleSorting(isSorted === "asc")}
      >
        <span>{title}</span>
        {isSorted === "desc" ? (
          <ArrowUpDown className="ml-2 h-4 w-4 rotate-180" />
        ) : isSorted === "asc" ? (
          <ArrowUpDown className="ml-2 h-4 w-4" />
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
        )}
      </Button>
    </div>
  );
}

// Helper component for column filters
export function DataTableColumnFilter<TData, TValue>({
  column,
  title,
  options,
}: {
  column: ReturnType<TanStackTable<TData>["getColumn"]>;
  title?: string;
  options?: { label: string; value: string }[];
}) {
  if (!column) {
    return null;
  }

  // Store column reference to ensure TypeScript knows it's defined in closures
  const columnRef = column;
  const facets = columnRef.getFacetedUniqueValues();
  const selectedValue = (columnRef.getFilterValue() as string) ?? "";
  const columnId = columnRef.id;

  if (options) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 border-dashed">
            <Filter className="mr-2 h-4 w-4" />
            {title || columnId}
            {selectedValue && (
              <>
                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">
                  {selectedValue}
                </span>
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem
            checked={selectedValue === ""}
            onCheckedChange={() => {
              columnRef.setFilterValue(undefined);
            }}
          >
            All
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selectedValue === option.value}
              onCheckedChange={() => {
                columnRef.setFilterValue(option.value === selectedValue ? undefined : option.value);
              }}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Input
      type="text"
      value={selectedValue}
      onChange={(e) => columnRef.setFilterValue(e.target.value)}
      placeholder={`Filter ${title || columnId}...`}
      className="h-8 w-[150px] lg:w-[250px]"
    />
  );
}
