import React, { useCallback, useMemo, useState } from "react";
import {
  Box, List, ListItem, ListItemButton, ListItemText, ListItemIcon, Divider,
  CircularProgress, Typography, TextField, InputAdornment, IconButton,
  Drawer, Tooltip,
} from "@mui/material";
import { Edit, Delete, Search as SearchIcon, Close } from "@mui/icons-material";
import type { ResourceObject, AnnotatedResourceField, ResourceOptions, Action } from "@vhrs/resources";
import { useRItem } from "../hooks/useRItem";
import DynamicForm from "./DynamicForm";
import ConfirmDialog, { describeRecord } from "./ConfirmDialog";

interface DynamicListProps {
  resource: ResourceObject;
  includeFields?: string[];
  auth?: any;
  options?: ResourceOptions;
  // Client-side row filter for dimensions the API can't express.
  // Only honored here — pair with hideTable on ResourcePage.
  itemFilter?: (item: any) => boolean;
  // Optional row click (e.g. navigate to a detail/review page).
  onRowClick?: (row: any) => void;
}

const stringifyValue = (value: any): string => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
};

const DynamicList: React.FC<DynamicListProps> = ({
  resource,
  includeFields,
  auth,
  options,
  itemFilter,
  onRowClick,
}) => {
  const { data, isLoading, error, fetchItems, saveItem, deleteItem }: any = useRItem(resource, options);

  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [pendingDelete, setPendingDelete] = useState<{ action: Action; rowData: any } | null>(null);

  const ctx = { resource, props: {}, auth };

  const fields = resource.fields;
  const displayFields = includeFields || Object.keys(fields);
  const secondaryFields = displayFields.slice(1);

  // Search only the fields marked `searchable`; if none are marked, search the
  // whole displayed row. Purely client-side — the list is not refetched.
  const searchableFields = useMemo(() => {
    const marked = displayFields.filter((field) => (fields as any)[field]?.searchable);
    return marked.length > 0 ? marked : displayFields;
  }, [displayFields, fields]);

  const resourceActions = useMemo(
    () =>
      (resource.actions || []).filter((action) => {
        const a = action();
        return a.name !== 'save' && !a.hidden;
      }),
    [resource.actions]
  );

  const editableFields = useMemo(
    () => Object.keys(fields).filter((field) => !(fields as any)[field]?.readOnly),
    [fields]
  );

  const renderFieldValue = (field: AnnotatedResourceField, value: any) => {
    const display = field?.display?.components?.asListItem;
    if (display) {
      const rendered = display(value, ctx);
      if (rendered !== null && rendered !== undefined && rendered !== '') return rendered;
    }
    return stringifyValue(value);
  };

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

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelectedRow(null);
  }, []);

  const handleSave = useCallback(async (formData: any) => {
    await saveItem(formData.id || '', formData);
    fetchItems();
    closeDrawer();
  }, [saveItem, fetchItems, closeDrawer]);

  if (isLoading && !data) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  if (error) return <Box p={2}>Error: {(error as any)?.message}</Box>;

  const rawItems = Array.isArray(data) ? data : [];
  const query = search.trim().toLowerCase();
  const items = rawItems
    .filter((item: any) => (itemFilter ? itemFilter(item) : true))
    .filter((item: any) => {
      if (!query) return true;
      return searchableFields.some((field) => {
        const value = item[field];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(query);
      });
    });

  const asIcon = resource.display?.components?.asIcon;
  const asListItem = resource.display?.components?.asListItem;

  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1, pb: 1 }}>
        <TextField
          size="small"
          placeholder="Search…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ maxWidth: 280, width: '100%' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearch('')}>
                  <Close fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          }}
        />
      </Box>

      {items.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">{query ? 'No matching records' : 'No records yet'}</Typography>
        </Box>
      ) : (
        <List disablePadding>
          {items.map((item: any, index: number) => {
            const primary = asListItem
              ? asListItem(item, ctx)
              : renderFieldValue((fields as any)[displayFields[0]], item[displayFields[0]]);
            const parts = secondaryFields
              .map((field: string) => renderFieldValue((fields as any)[field], item[field]))
              .filter((v) => v !== null && v !== undefined && v !== '');
            const secondary = parts.length === 0 ? undefined : (
              <Box component="span">
                {parts.map((part, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <Box component="span" sx={{ mx: 0.75, color: 'text.disabled' }}>
                        •
                      </Box>
                    )}
                    {part as React.ReactNode}
                  </React.Fragment>
                ))}
              </Box>
            );
            const body = (
              <>
                {asIcon && (
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {asIcon(item, ctx)}
                  </ListItemIcon>
                )}
                <ListItemText primary={primary} secondary={secondary} />
              </>
            );
            return (
              <React.Fragment key={item.id ?? index}>
                {index > 0 && <Divider component="li" />}
                <ListItem
                  secondaryAction={
                    resourceActions.length > 0 ? (
                      <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                        {resourceActions.map((action) => {
                          const actionData = action(item, { resource, props: {}, auth, saveItem, deleteItem });
                          if (actionData.hidden) return null;
                          return (
                            <Tooltip key={actionData.name} title={actionData.title || actionData.name}>
                              <IconButton
                                size="small"
                                color={actionData.color}
                                onClick={() =>
                                  actionData.name === 'edit'
                                    ? handleEdit(item)
                                    : handleDelete(action, item)
                                }
                              >
                                {actionData.icon ||
                                  (actionData.name === 'edit' ? <Edit fontSize="small" /> : <Delete fontSize="small" />)}
                              </IconButton>
                            </Tooltip>
                          );
                        })}
                      </Box>
                    ) : undefined
                  }
                >
                  {onRowClick ? (
                    <ListItemButton onClick={() => onRowClick(item)} sx={{ borderRadius: 1 }}>
                      {body}
                    </ListItemButton>
                  ) : (
                    body
                  )}
                </ListItem>
              </React.Fragment>
            );
          })}
        </List>
      )}

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeDrawer}
        sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 480 } } }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              {resource.display?.components?.asTitle?.() || resource.name}
            </Typography>
            <IconButton onClick={closeDrawer}>
              <Close />
            </IconButton>
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
        title="Delete record"
        message={
          pendingDelete
            ? `Are you sure you want to delete ${describeRecord(pendingDelete.rowData)}?`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={confirmPendingDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Box>
  );
};

export default DynamicList;
