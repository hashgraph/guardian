"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconSortAscending,
  IconSortDescending,
} from "@tabler/icons-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { DeviceRecord } from "@/lib/types/indexer"
import { formatKWh } from "@/lib/utils/format"

const columns: ColumnDef<DeviceRecord>[] = [
  {
    accessorKey: "device_id",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Device ID
        {column.getIsSorted() === "asc" ? (
          <IconSortAscending className="size-3" />
        ) : column.getIsSorted() === "desc" ? (
          <IconSortDescending className="size-3" />
        ) : null}
      </button>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.device_id}</span>
    ),
  },
  {
    accessorKey: "date_from",
    header: "Period Start",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.date_from}</span>
    ),
  },
  {
    accessorKey: "date_to",
    header: "Period End",
    cell: ({ row }) => <span className="text-sm">{row.original.date_to}</span>,
  },
  {
    accessorKey: "eg_p_d_y",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 font-medium w-full justify-end"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Energy (kWh)
        {column.getIsSorted() === "asc" ? (
          <IconSortAscending className="size-3" />
        ) : column.getIsSorted() === "desc" ? (
          <IconSortDescending className="size-3" />
        ) : null}
      </button>
    ),
    cell: ({ row }) => (
      <div className="text-right font-mono text-sm">
        {formatKWh(row.original.eg_p_d_y)}
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={
          (row.original.eg_p_d_y ?? 0) > 0
            ? "text-green-700 border-green-300 bg-green-50"
            : "text-muted-foreground"
        }
      >
        {(row.original.eg_p_d_y ?? 0) > 0 ? "Active" : "Inactive"}
      </Badge>
    ),
  },
]

export function DeviceDataTable({ devices }: { devices: DeviceRecord[] }) {
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [sorting, setSorting] = React.useState<SortingState>([])

  const table = useReactTable({
    data: devices,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 50 } },
    globalFilterFn: (row, _columnId, filterValue) => {
      return String(row.original.device_id).includes(filterValue)
    },
  })

  const activeCount = devices.filter((d) => (d.eg_p_d_y ?? 0) > 0).length
  const totalEnergy = devices.reduce((sum, d) => sum + (d.eg_p_d_y ?? 0), 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="rounded-lg border p-3">
          <div className="text-muted-foreground text-xs mb-1">Total Records</div>
          <div className="text-lg font-semibold">{devices.length.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-muted-foreground text-xs mb-1">Active Devices</div>
          <div className="text-lg font-semibold text-green-700">{activeCount.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-muted-foreground text-xs mb-1">Total Energy</div>
          <div className="text-lg font-semibold">{totalEnergy.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh</div>
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Search by device ID..."
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        className="max-w-sm"
      />

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          {table.getFilteredRowModel().rows.length.toLocaleString()} of {devices.length.toLocaleString()} records
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <Button variant="outline" size="icon" className="size-8" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
            <IconChevronsLeft className="size-3" />
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <IconChevronLeft className="size-3" />
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <IconChevronRight className="size-3" />
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
            <IconChevronsRight className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}
