import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { resources } from '@vhrs/resources';
import { useRItem } from '../hooks/useRItem';
import { relatedItemLabel } from './relatedItemLabel';

interface RelatedFieldCellProps {
  resourceName?: string;
  value: any;
  displayField?: string;
}

// Renders a related (FK / M2M) value using the related resource's own display
// components. Resolution order:
//   1. resource-level asTableCell
//   2. the related resource's `name` field display (asTableCell / asTitle)
//   3. resource-level asListItem
//   4. the raw name/title/displayField, or `#id`
const RelatedFieldCell: React.FC<RelatedFieldCellProps> = ({
  resourceName,
  value,
  displayField,
}) => {
  const resource = resourceName ? (resources as any)[resourceName] : undefined;
  const { data } = useRItem(resource, { fetchOnDeclare: !!resource, pageSize: 100 });

  const ids = useMemo(
    () =>
      (Array.isArray(value) ? value : [value]).filter(
        (v) => v !== null && v !== undefined && v !== ''
      ),
    [value]
  );

  const items = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    return ids
      .map((id) => list.find((item: any) => String(item.id) === String(id)))
      .filter(Boolean);
  }, [data, ids]);

  if (!resource) return <>{value ?? '-'}</>;
  if (ids.length === 0) return <>-</>;

  const ctx = { resource, props: {}, auth: null };
  const components = resource.display?.components;

  const renderOne = (item: any, key: React.Key) => {
    if (components?.asTableCell) {
      return <React.Fragment key={key}>{components.asTableCell(item, ctx)}</React.Fragment>;
    }
    const nameField = (resource.fields as any)?.name;
    const nameDisplay =
      nameField?.display?.components?.asTableCell || nameField?.display?.components?.asTitle;
    if (nameDisplay && item.name !== undefined) {
      return <React.Fragment key={key}>{nameDisplay(item.name, ctx)}</React.Fragment>;
    }
    if (components?.asListItem) {
      return <React.Fragment key={key}>{components.asListItem(item, ctx)}</React.Fragment>;
    }
    return (
      <Typography key={key} variant="body2">
        {relatedItemLabel(item, displayField)}
      </Typography>
    );
  };

  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {ids.map((id) => `#${id}`).join(', ')}
      </Typography>
    );
  }

  if (items.length === 1) return <>{renderOne(items[0], 'single')}</>;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
      {items.map((item, index) => renderOne(item, item.id ?? index))}
    </Box>
  );
};

export default RelatedFieldCell;
