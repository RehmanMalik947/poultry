import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { TablePagination } from './TablePagination';
import { Loader2, FileDown, FileSpreadsheet } from 'lucide-react';
import { cn } from '../ui/utils';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Button } from "../ui/button";
export type Column<T> = {
  header: string;
  accessor?: keyof T;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'center' | 'right';
};

interface DataTableProps<T> {
  title?: string;
  icon?: React.ElementType;
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  exportable?: boolean;
  exportFileName?: string;

  error?: string | null;
  filters?: React.ReactNode;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    onPageChange: (page: number) => void;
    onLimitChange?: (limit: number) => void;
    itemLabel?: string;
  };
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
  cardClassName?: string;
  footer?: React.ReactNode;
}

export function DataTable<T extends { id: string | number }>({
  title,
  icon: Icon,
  columns,
  data,
  exportable = false,
  exportFileName = "Export",
  loading,
  error,
  filters,
  pagination,
  emptyMessage = "No records found",
  onRowClick,
  className,
  cardClassName,
  footer,
}: DataTableProps<T>) {
  function extractText(node: React.ReactNode): string {
    if (node == null) return '';
    if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
      return String(node);
    }
    if (Array.isArray(node)) return node.map(extractText).join(' ').trim();
    if (typeof node === 'object' && 'props' in node) {
      return extractText((node as any).props.children);
    }
    return '';
  }

  const getExportData = () => {
    return data.map((row, rowIndex) => {
      const exportRow: Record<string, any> = {};

      columns.forEach((col) => {
        if (col.accessor) {
          exportRow[col.header] = row[col.accessor];
        } else if (col.render) {
          const rendered = col.render(row, rowIndex);
          exportRow[col.header] = extractText(rendered);
        }
      });

      return exportRow;
    });
  };

  const exportExcel = () => {
    const exportData = getExportData();

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Data"
    );

    XLSX.writeFile(
      workbook,
      `${exportFileName}.xlsx`
    );
  };

  const exportCSV = () => {
    const exportData = getExportData();

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    const csv = XLSX.utils.sheet_to_csv(worksheet);

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    saveAs(blob, `${exportFileName}.csv`);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-800 text-sm">
          {error}
        </div>
      )}

      <Card className={cn("shadow-sm gap-0", cardClassName)}>
        {(title || filters || exportable) && (
          <CardHeader className="p-3 flex flex-col gap-0">
            <div className="flex items-center justify-between gap-3 flex-wrap w-full">
              {title && (
                <CardTitle className="flex items-center gap-2 text-lg">
                  {Icon && <Icon className="h-5 w-5 text-primary" />}
                  {title}
                  {pagination && !loading && (
                    <span className="text-sm font-normal text-gray-400">
                      ({pagination.total})
                    </span>
                  )}
                </CardTitle>
              )}
              <div className="flex gap-2 items-center">
                {exportable && (
                  <>
                    <Button type="button" variant="outline" size="sm" onClick={exportCSV} disabled={data.length === 0} className="border-gray-300 border-2 bg-gray-100 h-9 w-[80px]">
                      <FileDown className="w-4 h-4" />
                      CSV
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={exportExcel} disabled={data.length === 0} className="border-gray-300 border-2 bg-gray-100 h-9 w-[80px]">
                      <FileSpreadsheet className="w-4 h-4" />
                      Excel
                    </Button>
                  </>
                )}
                {filters}
              </div>
            </div>
          </CardHeader>
        )}

        <CardContent className="p-0 [&:last-child]:pb-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary/90 border-none">
                  {columns.map((col, idx) => (
                    <TableHead
                      key={idx}
                      className={cn(
                        "text-white font-semibold px-3 h-10",
                        col.align === 'right' && "text-right",
                        col.align === 'center' && "text-center",
                        col.headerClassName
                      )}
                    >
                      {col.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-32 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-32 text-center text-gray-400">
                      <p>{emptyMessage}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row, rowIndex) => (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "hover:bg-gray-50/50 transition-colors",
                        onRowClick && "cursor-pointer"
                      )}
                      onClick={() => onRowClick?.(row)}
                    >
                      {columns.map((col, idx) => (
                        <TableCell
                          key={idx}
                          className={cn(
                            "px-3 py-2 text-sm",
                            col.align === 'right' && "text-right",
                            col.align === 'center' && "text-center",
                            col.className
                          )}
                        >
                          {col.render ? col.render(row, rowIndex) : (row[col.accessor!] as React.ReactNode)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {pagination && !loading && data.length > 0 && (
            <div className="p-3 border-t">
              <TablePagination
                total={pagination.total}
                page={pagination.page}
                limit={pagination.limit}
                onPageChange={pagination.onPageChange}
                itemLabel={pagination.itemLabel}
              />
            </div>
          )}

          {footer && <div className="border-t">{footer}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
