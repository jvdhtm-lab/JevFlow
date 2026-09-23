import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { SortingState, ColumnFiltersState } from "@tanstack/react-table";
import { useRItem } from "../hooks/useRItem";
import type { ResourceObject, AnnotatedResourceField, Action, ResourceOptions } from "@vhrs/resources";
import {
  Box, TableCell, Drawer, Tabs, Tab, IconButton, Typography,
  Menu, MenuItem, ListItemIcon, ListItemText, Checkbox, Toolbar,
  Tooltip, Divider, TextField, Select,
} from "@mui/material";
import { Edit, Delete, Close, ViewColumn, Refresh, ArrowUpward, ArrowDownward, FilterList } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import DynamicList from "./DynamicList";
import DynamicForm from "./DynamicForm";
import ConfirmDialog, { describeRecord } from "./ConfirmDialog";

interface DynamicTableProps {
  resource: ResourceObject;
  includeHeader?: string[];
  auth?: any;
  options?: ResourceOptions;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
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

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
};

const DynamicTable: React.FC<DynamicTableProps> = ({
  resource,
  includeHeader,
  auth,
  options
}) => {
  const theme = useTheme();
  const headers = includeHeader || Object.keys(resource.fields).slice(0, 5);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [tabValue, setTabValue] = useState(0);
  const [columnAnchorEl, setColumnAnchorEl] = useState<null | HTMLElement>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(headers));
  const [pendingDelete, setPendingDelete] = useState<{ action: Action; rowData: any } | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [filtersVisible, setFiltersVisible] = useState(true);
  // Exact-value filters (selects, booleans) go to the backend as query
  // params; free text and dates filter the loaded rows locally instead.
  const [apiFilter, setApiFilter] = useState<Record<string, any>>({});

  const mergedOptions = useMemo(
    () => ({ ...options, filter: { ...(options as any)?.filter, ...apiFilter } }),
    [options, apiFilter]
  );
  const { data, isLoading, error, fetchItems, saveItem, deleteItem }: any = useRItem(resource, mergedOptions);

  const apiFilterFirstRun = useRef(true);
  useEffect(() => {
    if (apiFilterFirstRun.current) {
      apiFilterFirstRun.current = false;
      return;
    }
    fetchItems(true);
  }, [apiFilter, fetchItems]);

  const columnHelper = createColumnHelper<any>();

  const getCellComponent = useCallback(
    (field: AnnotatedResourceField, value: any) => {
      const display = field.display?.components?.asTableCell;
      return display ? display(value, { resource, props: {}, auth }) : (value === null || value === undefined ? '' : String(value));
    },
    [resource, auth]
  );

  const resourceActions = useMemo(() => {
    return resource.actions || [];
  }, [resource.actions]);

  const handleEdit = useCallback((rowData: any) => {
    setSelectedRow(rowData);
    setTabValue(1);
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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedRow(null);
    setTabValue(0);
  };

  const resourceFields = Object.keys(resource.fields);

  const handleSave = useCallback(async (formData: any) => {
    await saveItem(formData.id || '', formData);
    fetchItems();
    closeDrawer();
  }, [saveItem, fetchItems]);

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
    const resourceFieldsObj: any = resource.fields;
    const activeHeaders = headers.filter((f) => visibleColumns.has(f));
    const cols: any[] = activeHeaders.map((field) => {
      const fieldDef = resourceFieldsObj[field];
      const hasOptions = filterOptionsFor(fieldDef) !== null;
      return columnHelper.accessor(field, {
        id: field,
        header: fieldDef?.title || field,
        cell: (info) => getCellComponent(fieldDef, info.getValue()),
        enableSorting: !!fieldDef?.sortable,
        enableColumnFilter: !!fieldDef?.filterable,
        filterFn: hasOptions ? equalsFilter : containsFilter,
      });
    });

    if (resourceActions.length > 0) {
      cols.push(
        columnHelper.display({
          id: 'actions',
          header: 'Actions',
          cell: ({ row }: any) => (
            <>
              {resourceActions.map((action) => {
                const actionData = action(row.original, { resource, props: {}, auth, saveItem, deleteItem });
                // Row actions are edit/delete/custom — never save (saving
                // unmodified row data is a no-op; save lives in the form footer)
                if (actionData.name === 'save' || actionData.hidden) return null;
                return (
                  <IconButton
                    key={actionData.name}
                    size="small"
                    color={(actionData.color as any) || 'default'}
                    onClick={() => actionData.name === 'edit' ? handleEdit(row.original) : handleDelete(action, row.original)}
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
  }, [columnHelper, getCellComponent, headers, visibleColumns, resource, resourceActions, auth, handleEdit, handleDelete, saveItem, deleteItem]);

  const table = useReactTable({
    data: data || [],
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
                const canSort = header.column.getCanSort();
                const sortDir = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
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
                // Exact-value filters (selects, booleans) go to the backend;
                // free text and dates filter the loaded rows locally.
                const applyFilter = (v: any) => {
                  const val = v === '' || v === undefined ? undefined : v;
                  if (options) {
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
                const displayValue = (options
                  ? apiFilter[column.id] ?? ''
                  : column.getFilterValue() ?? '') as string;
                const asFilter = (fieldDef as any)?.display?.components?.asFilter;
                return (
                  <th key={column.id} style={{ padding: '4px 8px', backgroundColor: theme.palette.grey[50] }}>
                    {asFilter ? (
                      asFilter(displayValue, {
                        resource,
                        props: { onChange: applyFilter },
                        auth,
                      })
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

          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="List" />
            <Tab label="Form" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <DynamicList resource={resource} includeFields={resourceFields.slice(0, 5)} />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <DynamicForm
              resource={resource}
              includeFields={editableFields}
              initialData={selectedRow}
              auth={auth}
              onSave={handleSave}
            />
          </TabPanel>
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
