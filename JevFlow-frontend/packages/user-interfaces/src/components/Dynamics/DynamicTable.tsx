import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { useRItem } from "../hooks/useRItem";
import type { ResourceObject, AnnotatedResourceField, Action, ResourceOptions } from "@vhrs/resources";
import {
  Box, TableCell, Drawer, IconButton, Typography,
  Menu, MenuItem, ListItemIcon, ListItemText, Checkbox, Toolbar, Chip,
  Tooltip, Divider, TextField, Select, Dialog, DialogTitle, DialogContent,
} from "@mui/material";
import { Edit, Delete, Close, ViewColumn, Refresh, ArrowUpward, ArrowDownward, FilterList } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import DynamicForm from "./DynamicForm";
import RelatedFieldFilter from "./RelatedFieldFilter";
import RelatedFieldCell from "./RelatedFieldCell";
import ConfirmDialog, { describeRecord } from "./ConfirmDialog";

interface DynamicTableProps {
  resource: ResourceObject;
  includeHeader?: string[];
  auth?: any;
  options?: ResourceOptions;
}

interface FilterOption {
  value: string;
  label: string;
}

// Case-insensitive "contains" over raw cell values of any type
const containsFilter = (row: any, columnId: string, filterValue: any) => {
  if (filterValue === undefined || filterValue === null || filterValue === '') return true;
  const cell = row.getValue(columnId);
  if (cell === null || cell === undefined) return false;
  return String(cell).toLowerCase().includes(String(filterValue).toLowerCase());
};

// Exact match over raw cell values of any type
const equalsFilter = (row: any, columnId: string, filterValue: any) => {
  if (filterValue === undefined || filterValue === null || filterValue === '') return true;
  const cell = row.getValue(columnId);
  if (cell === null || cell === undefined) return false;
  return String(cell) === String(filterValue);
};

// Normalize enum / enumItems / boolean field definitions to select options
const filterOptionsFor = (fieldDef: any): FilterOption[] | null => {
  if (!fieldDef) return null;
  if (Array.isArray(fieldDef.enum)) {
    return fieldDef.enum.map((v: any) => ({ value: String(v), label: String(v) }));
  }
  if (Array.isArray(fieldDef.enumItems)) {
    return fieldDef.enumItems.map((item: any) => {
      if (typeof item === 'string') return { value: item, label: item };
      return { value: String(item.value ?? item.id), label: String(item.label ?? item.text ?? item.value ?? item.id) };
    });
  }
  if (fieldDef.type === 'boolean') {
    return [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' },
    ];
  }
  return null;
};

const DynamicTable: React.FC<DynamicTableProps> = ({
  resource,
  includeHeader,
  auth,
  options
}) => {
  const theme = useTheme();
  const headers = includeHeader || Object.keys(resource.fields).slice(0, 5);

  const resourceRef = useRef(resource);
  resourceRef.current = resource;
  const authRef = useRef(auth);
  authRef.current = auth;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [columnAnchorEl, setColumnAnchorEl] = useState<null | HTMLElement>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(headers));
  const [pendingDelete, setPendingDelete] = useState<{ action: Action; rowData: any } | null>(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [sortBy, setSortBy] = useState<string[]>([]);
  const [showRow, setShowRow] = useState<any>(null);
  // Exact-value filters (selects, booleans) go to the backend as query
  // params; free text and dates filter the loaded rows locally instead.
  const [apiFilter, setApiFilter] = useState<Record<string, any>>({});

  const mergedOptions = useMemo(() => {
    const hasFilter = Object.keys(apiFilter).length > 0;
    const hasSort = sortBy.length > 0;
    if (!hasFilter && !hasSort) return options;
    return {
      ...options,
      ...(hasFilter ? { filter: { ...(options as any)?.filter, ...apiFilter } } : {}),
      ...(hasSort ? { sortBy } : {}),
    };
  }, [options, apiFilter, sortBy]);
  const { data, total, isLoading, error, fetchItems, saveItem, deleteItem }: any = useRItem(resource, mergedOptions);

  const apiFilterFirstRun = useRef(true);
  const prevApiFilterRef = useRef(apiFilter);
  const prevSortByRef = useRef<string[]>([]);
  useEffect(() => {
    if (apiFilterFirstRun.current) {
      apiFilterFirstRun.current = false;
      prevSortByRef.current = sortBy;
      return;
    }
    const sortChanged = prevSortByRef.current !== sortBy;
    if (!sortChanged && prevApiFilterRef.current === apiFilter) return;
    prevApiFilterRef.current = apiFilter;
    prevSortByRef.current = sortBy;
    fetchItems(true);
  }, [apiFilter, sortBy, fetchItems]);

  const sortDirOf = useCallback((columnId: string) => {
    if (sortBy.includes(columnId)) return 'asc';
    if (sortBy.includes(`-${columnId}`)) return 'desc';
    return null;
  }, [sortBy]);

  const toggleSort = useCallback((columnId: string) => {
    setSortBy((prev) => {
      if (prev.includes(columnId)) return [`-${columnId}`];
      if (prev.includes(`-${columnId}`)) return [];
      return [columnId];
    });
  }, []);

  const columnHelper = createColumnHelper<any>();

  const getCellComponent = useCallback(
    (field: AnnotatedResourceField, value: any, row?: any) => {
      const display = field.display?.components?.asTableCell;
      if (display) return display(value, { resource: resourceRef.current, props: {}, auth: authRef.current, row });
      // Related (FK / M2M) fields render through the related resource's own
      // display components, so related resources control their presentation.
      const related = (field as any)?.['x-vhrs-relatedResource'] ||
        (field as any)?.items?.['x-vhrs-relatedResource'];
      if (related) {
        return <RelatedFieldCell resourceName={String(related).split('.').pop()} value={value} />;
      }
      if (value === null || value === undefined || value === '') return '';
      if (typeof value === 'object') {
        // Guard against rendering raw objects (e.g. nested FKs) which React
        // cannot render and would crash the table.
        return value.name ?? value.title ?? value.label ?? JSON.stringify(value);
      }
      return String(value);
    },
    []
  );

  const resourceActions = useMemo(() => {
    return resource.actions || [];
  }, [resource.actions]);

  const handleEdit = useCallback((rowData: any) => {
    setSelectedRow(rowData);
    setDrawerOpen(true);
  }, []);

  const handleDelete = useCallback((action: Action, rowData: any) => {
    const actionData = action(rowData, { resource, props: {}, auth, saveItem, deleteItem });
    if (actionData.name === 'delete') {
      setPendingDelete({ action, rowData });
      return;
    }
    void (async () => {
      if (actionData.useHandler) {
        await actionData.useHandler();
        fetchItems();
      }
    })();
  }, [resource, auth, fetchItems, saveItem, deleteItem]);

  const confirmPendingDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const { action, rowData } = pendingDelete;
    setPendingDelete(null);
    const actionData = action(rowData, { resource, props: {}, auth, saveItem, deleteItem });
    if (actionData.useHandler) {
      await actionData.useHandler();
      fetchItems();
    }
  }, [pendingDelete, resource, auth, saveItem, deleteItem, fetchItems]);

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedRow(null);
  };

  const resourceFields = Object.keys(resource.fields);

  const handleSave = useCallback(async (formData: any) => {
    await saveItem(formData.id || '', formData);
    fetchItems();
    closeDrawer();
  }, [saveItem, fetchItems]);

  const renderCard = (rowData: any) => {
    const comps: any = resourceRef.current.display?.components || {};
    const ctx = { resource: resourceRef.current, props: {}, auth: authRef.current, row: rowData };
    if (comps.asCard) return comps.asCard(rowData, ctx);
    if (comps.asListItem) return comps.asListItem(rowData, ctx);
    if (comps.asTitle) return comps.asTitle(rowData, ctx);
    return (
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {rowData?.name || rowData?.title || `#${rowData?.id}`}
      </Typography>
    );
  };

  const editableFields = useMemo(() => {
    const fields: any = resource.fields;
    return resourceFields.filter((f) => !fields[f]?.readOnly);
  }, [resourceFields, resource.fields]);

  const toggleColumn = useCallback((field: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  }, []);

  const columns = useMemo(() => {
    const resourceFieldsObj: any = resourceRef.current.fields;
    const activeHeaders = headers.filter((f) => visibleColumns.has(f));
    const cols: any[] = activeHeaders.map((field) => {
      const fieldDef = resourceFieldsObj[field];
      const hasOptions = filterOptionsFor(fieldDef) !== null;
      return columnHelper.accessor(field, {
        id: field,
        header: fieldDef?.title || field,
        cell: (info) => getCellComponent(fieldDef, info.getValue(), info.row.original),
        enableSorting: !!fieldDef?.sortable,
        enableColumnFilter: !!fieldDef?.filterable,
        filterFn: hasOptions ? equalsFilter : containsFilter,
      });
    });

    if (resourceActions.length > 0) {
      const canWrite = !authRef.current?.can || authRef.current.can(resourceRef.current.name, 'W');
      const canDelete = !authRef.current?.can || authRef.current.can(resourceRef.current.name, 'D');
      cols.push(
        columnHelper.display({
          id: 'actions',
          header: 'Actions',
          cell: ({ row }: any) => (
            <>
              {resourceActions.map((action) => {
                const actionData = action(row.original, { resource: resourceRef.current, props: {}, auth: authRef.current, saveItem, deleteItem });
                // Row actions are edit/delete/custom/show — never save (saving
                // unmodified row data is a no-op; save lives in the form footer)
                if (actionData.name === 'save' || actionData.hidden) return null;
                if (actionData.name === 'edit' && !canWrite) return null;
                if (actionData.name === 'delete' && !canDelete) return null;
                return (
                  <IconButton
                    key={actionData.name}
                    size="small"
                    color={(actionData.color as any) || 'default'}
                    onClick={() => {
                      if (actionData.name === 'edit') handleEdit(row.original);
                      else if (actionData.name === 'show' || (actionData as any).card) setShowRow(row.original);
                      else handleDelete(action, row.original);
                    }}
                  >
                    {actionData.icon || (actionData.name === 'edit' ? <Edit /> : <Delete />)}
                  </IconButton>
                );
              })}
            </>
          )
        })
      );
    }

    return cols;
  }, [getCellComponent, headers, visibleColumns, resourceActions, handleEdit, handleDelete, saveItem, deleteItem]);

  const table = useReactTable({
    data: data || [],
    columns,
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const showFilterRow = table.getVisibleLeafColumns().some((c) => c.getCanFilter());

  if (isLoading && !data) return <Box p={2}>Loading...</Box>;
  if (error) return <Box p={2}>Error: {error.message}</Box>;

  return (
    <Box sx={{ p: 2, overflowX: 'auto' }}>
      <Toolbar
        sx={{
          px: 1,
          py: 0.5,
          mb: 1,
          borderRadius: 1,
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 0.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 'auto' }}>
          <Chip size="small" variant="outlined" label={typeof total === 'number' ? total : (data || []).length} />
        </Box>
        <Tooltip title="Refresh">
          <IconButton
            size="small"
            onClick={() => fetchItems(true)}
            disabled={isLoading}
          >
            <Refresh fontSize="small" sx={{ animation: isLoading ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
          </IconButton>
        </Tooltip>
        {showFilterRow && (
          <Tooltip title={filtersVisible ? "Hide filters" : "Show filters"}>
            <IconButton
              size="small"
              color={filtersVisible ? "primary" : "default"}
              onClick={() => setFiltersVisible((v) => !v)}
            >
              <FilterList fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Select columns">
          <IconButton
            size="small"
            onClick={(e) => setColumnAnchorEl(e.currentTarget)}
          >
            <ViewColumn fontSize="small" />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={columnAnchorEl}
          open={Boolean(columnAnchorEl)}
          onClose={() => setColumnAnchorEl(null)}
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              border: '1px solid',
              borderColor: 'divider',
              mt: 0.5,
              maxHeight: 300,
              minWidth: 200,
            },
          }}
        >
          <Box sx={{ px: 2, py: 1, fontWeight: 600, fontSize: '0.85rem', color: 'text.secondary' }}>
            Columns
          </Box>
          <Divider />
          {headers.map((field) => {
            const fieldDef = (resource.fields as any)?.[field];
            const label = fieldDef?.title || field;
            return (
              <MenuItem
                key={field}
                dense
                onClick={() => toggleColumn(field)}
                sx={{ py: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Checkbox
                    size="small"
                    checked={visibleColumns.has(field)}
                    disableRipple
                  />
                </ListItemIcon>
                <ListItemText primary={label} primaryTypographyProps={{ variant: 'body2' }} />
              </MenuItem>
            );
          })}
        </Menu>
      </Toolbar>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const fieldDef = (resource.fields as any)?.[header.column.id];
                const canSort = !!fieldDef?.sortable;
                const sortDir = sortDirOf(header.column.id);
                return (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    onClick={canSort ? () => toggleSort(header.column.id) : undefined}
                    style={{
                      textAlign: 'left', padding: '8px', borderBottom: `2px solid ${theme.palette.divider}`,
                      backgroundColor: theme.palette.grey[50], fontWeight: 600, fontSize: '0.85rem',
                      color: theme.palette.text.secondary,
                      cursor: canSort ? 'pointer' : undefined,
                      userSelect: canSort ? 'none' : undefined,
                    }}
                  >
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {sortDir === 'asc' && <ArrowUpward sx={{ fontSize: 14 }} />}
                      {sortDir === 'desc' && <ArrowDownward sx={{ fontSize: 14 }} />}
                    </Box>
                  </th>
                );
              })}
            </tr>
          ))}
          {showFilterRow && filtersVisible && (
            <tr>
              {table.getVisibleLeafColumns().map((column) => {
                if (column.id === 'actions' || !column.getCanFilter()) {
                  return <th key={column.id} style={{ padding: '4px 8px', backgroundColor: theme.palette.grey[50] }} />;
                }
                const fieldDef = (resource.fields as any)?.[column.id];
                const options = filterOptionsFor(fieldDef);
                const related = (fieldDef?.['x-vhrs-relatedResource'] ||
                  fieldDef?.items?.['x-vhrs-relatedResource']) as string | undefined;
                const relatedResourceName = related ? related.split('.').pop() : undefined;
                // Exact-value filters (selects, booleans, related FK/M2M) go to
                // the backend; free text and dates filter loaded rows locally.
                const backendFilter = !!options || !!relatedResourceName;
                const applyFilter = (v: any) => {
                  const val = v === '' || v === undefined || v === null ? undefined : v;
                  if (backendFilter) {
                    setApiFilter((prev) => {
                      const next = { ...prev };
                      if (val === undefined) {
                        delete next[column.id];
                      } else {
                        next[column.id] = val;
                      }
                      return next;
                    });
                  } else {
                    column.setFilterValue(val);
                  }
                };
                const displayValue = (backendFilter
                  ? apiFilter[column.id] ?? ''
                  : column.getFilterValue() ?? '') as string;
                const asFilter = (fieldDef as any)?.display?.components?.asFilter;
                return (
                  <th key={column.id} style={{ padding: '4px 8px', backgroundColor: theme.palette.grey[50] }}>
                    {asFilter ? (
                      asFilter(displayValue, {
                        resource,
                        props: { onChange: applyFilter, fieldName: column.id },
                        auth,
                      })
                    ) : relatedResourceName ? (
                      <RelatedFieldFilter
                        resourceName={relatedResourceName}
                        value={displayValue}
                        onChange={applyFilter}
                      />
                    ) : options ? (
                      <Select
                        size="small"
                        fullWidth
                        displayEmpty
                        value={displayValue}
                        onChange={(e) => applyFilter(e.target.value)}
                        sx={{ fontSize: '0.8rem', backgroundColor: theme.palette.background.paper }}
                      >
                        <MenuItem value="">
                          <em>All</em>
                        </MenuItem>
                        {options.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    ) : (
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Filter…"
                        value={displayValue}
                        onChange={(e) => applyFilter(e.target.value)}
                        sx={{
                          backgroundColor: theme.palette.background.paper,
                          '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.75 },
                        }}
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          )}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} sx={{ padding: '8px', borderBottom: `1px solid ${theme.palette.divider}` }}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {data?.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          No data available
        </Box>
      )}

      <Dialog open={!!showRow} onClose={() => setShowRow(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {resource.display?.components?.asTitle?.(showRow) || resource.name}
          <IconButton size="small" onClick={() => setShowRow(null)}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>{showRow && renderCard(showRow)}</DialogContent>
      </Dialog>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeDrawer}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: '50%' },
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              {resource.display?.components?.asTitle?.() || resource.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <IconButton onClick={closeDrawer}>
                <Close />
              </IconButton>
            </Box>
          </Box>

          <DynamicForm
            resource={resource}
            includeFields={editableFields}
            initialData={selectedRow}
            auth={auth}
            onSave={handleSave}
          />
        </Box>
      </Drawer>

      <ConfirmDialog
        open={!!pendingDelete}
        message={`Are you sure you want to delete ${describeRecord(pendingDelete?.rowData)}? This cannot be undone.`}
        onConfirm={confirmPendingDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Box>
  );
};

export default DynamicTable;
