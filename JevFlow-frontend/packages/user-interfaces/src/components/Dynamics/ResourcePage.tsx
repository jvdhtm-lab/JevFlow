import React, { useMemo, useState } from 'react';
import { Box, Typography, Tabs, Tab, Button, Drawer, IconButton, Paper, Chip } from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { ResourceObject, ResourceOptions } from '@vhrs/resources';
import { useRItem } from '../hooks/useRItem';
import DynamicTable from './DynamicTable';
import DynamicList from './DynamicList';
import DynamicForm from './DynamicForm';

interface ResourcePageProps {
  resource: ResourceObject;
  auth?: any;
  title?: string;
  // List-only mode: skips the Table tab (tables need full rows; lists
  // work well on pre-filtered subsets)
  hideTable?: boolean;
  resourceOptions?: ResourceOptions;
  // Client-side row filter, applied to the list only
  itemFilter?: (item: any) => boolean;
  // Prefilled values for the create form (e.g. { trigger_source: 'manual' })
  createDefaults?: Record<string, any>;
}

export const ResourcePage: React.FC<ResourcePageProps> = ({
  resource,
  auth,
  title: titleOverride,
  hideTable,
  resourceOptions,
  itemFilter,
  createDefaults,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  // fetchOnDeclare: false — the table already fetches; this only reads shared cache
  // for the count and provides saveItem for resources without form actions
  const { data: headerData, total, saveItem } = useRItem(resource, { fetchOnDeclare: false });
  const shownTotal =
    itemFilter && Array.isArray(headerData) ? headerData.filter(itemFilter).length : total;

  const fields = useMemo(() => Object.keys(resource.fields), [resource.fields]);
  const tableColumns = useMemo(
    () => resource.tableColumns ?? fields,
    [resource.tableColumns, fields]
  );
  const listFields = useMemo(
    () => resource.tableColumns ?? fields.slice(0, 5),
    [resource.tableColumns, fields]
  );
  const singular = resource.meta?.resourceNameSingular ?? resource.name;

  const editableFields = useMemo(() => {
    const defs: any = resource.fields;
    return fields.filter((f) => !defs[f]?.readOnly);
  }, [fields, resource.fields]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const title = titleOverride ?? resource.display?.components?.asTitle?.() ?? resource.name;

  const hasFormSaveAction = useMemo(
    () =>
      (resource.actions || []).some((action) => {
        const a = action();
        return a.name !== 'edit' && a.showInForm !== false && !a.hidden;
      }),
    [resource.actions]
  );

  const handleCreate = async (formData: any) => {
    if (!hasFormSaveAction) {
      // No footer action saves for this resource — save explicitly
      // (saveItem with empty id POSTs a new record)
      await saveItem('', formData);
    }
    // With a footer save action, DynamicForm already saved via resource.actions;
    // onSave is only parent-side cleanup (close the drawer)
    setCreateOpen(false);
  };

  return (
    <Box p={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h5" fontWeight={600}>{title}</Typography>
          <Chip size="small" label={shownTotal} variant="outlined" />
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          Add {singular}
        </Button>
      </Box>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {!hideTable && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Table" />
              <Tab label="List" />
            </Tabs>
          </Box>
        )}

        {(!hideTable && tabValue === 0) && (
          <Box role="tabpanel">
            <DynamicTable
              key={`${resource.name}-table`}
              resource={resource}
              includeHeader={tableColumns}
              auth={auth}
              options={resourceOptions}
            />
          </Box>
        )}

        {(hideTable || tabValue === 1) && (
          <Box role="tabpanel">
            <DynamicList
              key={`${resource.name}-list`}
              resource={resource}
              includeFields={listFields}
              auth={auth}
              options={resourceOptions}
              itemFilter={itemFilter}
            />
          </Box>
        )}
      </Paper>

      <Drawer
        anchor="right"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: 480 },
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Add {singular}</Typography>
            <IconButton onClick={() => setCreateOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <DynamicForm
            resource={resource}
            includeFields={editableFields}
            initialData={createDefaults}
            auth={auth}
            onSave={handleCreate}
          />
        </Box>
      </Drawer>
    </Box>
  );
};

export default ResourcePage;
