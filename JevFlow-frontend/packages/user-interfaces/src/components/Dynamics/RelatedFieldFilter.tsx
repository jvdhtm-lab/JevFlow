import React, { useMemo } from 'react';
import { Autocomplete, Box, TextField, CircularProgress } from '@mui/material';
import { resources } from '@vhrs/resources';
import { useRItem } from '../hooks/useRItem';
import { relatedItemLabel } from './relatedItemLabel';

interface RelatedFieldFilterProps {
  resourceName?: string;
  value?: any;
  onChange: (value: any) => void;
  displayField?: string;
  label?: string;
  placeholder?: string;
}

const extractModelName = (relatedResource: string): string => {
  const parts = relatedResource.split('.');
  return parts[parts.length - 1];
};

const RelatedFieldFilter: React.FC<RelatedFieldFilterProps> = ({
  resourceName,
  value,
  onChange,
  displayField,
  label,
  placeholder,
}) => {
  const relatedResource = resourceName ? (resources as any)[resourceName] : undefined;
  const { data, isLoading } = useRItem(relatedResource, {
    fetchOnDeclare: !!relatedResource,
    pageSize: 100,
  });

  const options = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    return list.map((item: any) => ({
      id: item.id,
      label: relatedItemLabel(item, displayField),
      raw: item,
    }));
  }, [data, displayField]);

  const selected = useMemo(() => {
    if (value === undefined || value === null || value === '') return null;
    return options.find((option) => String(option.id) === String(value)) || null;
  }, [options, value]);

  if (!relatedResource) return null;

  return (
    <Autocomplete
      size="small"
      options={options}
      loading={isLoading}
      value={selected}
      onChange={(_, newValue) => onChange(newValue?.id ?? undefined)}
      getOptionLabel={(option: any) => option.label || ''}
      isOptionEqualToValue={(a: any, b: any) => String(a.id) === String(b.id)}
      renderOption={(props, option: any) => {
        const components = relatedResource.display?.components;
        const content =
          components?.asListItem?.(option.raw, { resource: relatedResource, props: {}, auth: null }) ||
          components?.asTitle?.(option.raw, { resource: relatedResource, props: {}, auth: null }) ||
          option.label;
        return (
          <Box component="li" {...props}>
            {content}
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label || `Filter ${resourceName}`}
          placeholder={placeholder || 'Search...'}
          size="small"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isLoading ? <CircularProgress size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          sx={{
            backgroundColor: 'background.paper',
            '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.75 },
          }}
        />
      )}
    />
  );
};

export { extractModelName };
export default RelatedFieldFilter;
