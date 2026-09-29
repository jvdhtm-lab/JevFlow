import React, { useEffect, useMemo } from 'react';
import { Autocomplete, TextField, CircularProgress, InputAdornment } from '@mui/material';
import { Search } from '@mui/icons-material';
import { useRItem } from '../hooks/useRItem';
import { resources, relatedFieldResourceName } from '@vhrs/resources';
import { relatedItemLabel } from './relatedItemLabel';

interface RelatedFieldInputProps {
  resourceName?: string;
  value: any;
  onChange: (value: any) => void;
  displayField?: string;
  label?: string;
  resource?: any;
  fieldName?: string;
  field?: any;
  error?: boolean;
  helperText?: string;
}

const RelatedFieldInput: React.FC<RelatedFieldInputProps> = ({
  resourceName,
  value,
  onChange,
  displayField = 'name',
  label,
  resource: resourceProp,
  fieldName,
  field,
  error,
  helperText,
}) => {
  const resolvedResourceName = useMemo(() => {
    if (resourceName) return resourceName;
    if (resourceProp && fieldName) {
      const fieldDef = resourceProp.fields?.[fieldName];
      const related = fieldDef?.['x-vhrs-relatedResource'];
      if (related) return relatedFieldResourceName(related);
    }
    if (field) {
      const related = field['x-vhrs-relatedResource'];
      if (related) return relatedFieldResourceName(related);
    }
    return '';
  }, [resourceName, resourceProp, fieldName, field]);

  const relatedResource = resolvedResourceName ? (resources as any)[resolvedResourceName] : undefined;

  const customAsFormInput = useMemo(() => {
    return relatedResource?.display?.components?.asFormInput || null;
  }, [relatedResource]);

  const { data, isLoading, fetchItems } = useRItem(relatedResource, {
    fetchOnDeclare: false,
    pageSize: 100,
  });

  useEffect(() => {
    if (relatedResource) fetchItems(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relatedResource]);

  const options = useMemo(() => {
    if (!data) return [];
    const list = Array.isArray(data) ? data : [];
    return list.map((item: any) => ({
      id: item.id,
      label: relatedItemLabel(item, displayField),
      raw: item,
    }));
  }, [data, displayField]);

  const selectedOption = useMemo(
    () => options.find((opt: any) => String(opt.id) === String(value)) || null,
    [options, value]
  );

  if (customAsFormInput) {
    return customAsFormInput(selectedOption?.id ?? value, {
      resource: relatedResource,
      props: {
        fieldName,
        onChange,
        options,
        selectedOption,
        isLoading,
        label: label || field?.title || `Select ${resolvedResourceName}`,
      },
      auth: null,
    });
  }

  return (
    <Autocomplete
      options={options}
      loading={isLoading}
      value={selectedOption}
      onChange={(_, newValue) => onChange(newValue?.id ?? null)}
      getOptionLabel={(option: any) => option.label || ''}
      isOptionEqualToValue={(a: any, b: any) => String(a.id) === String(b.id)}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label || field?.title || fieldName || `Select ${resolvedResourceName}`}
          placeholder="Search..."
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: (
              <>
                {isLoading ? <CircularProgress size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};

export default RelatedFieldInput;
