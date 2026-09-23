import React from "react";
import { Autocomplete, TextField } from "@mui/material";
import { relatedFieldResourceName, resources } from "@vhrs/resources";
import { useRItem } from "../hooks/useRItem";

interface Props {
  fieldName: string;
  field: any;
  value: any;
  onChange: (v: any) => void;
  label?: string;
}

const RelatedFieldInput: React.FC<Props> = ({ field, value, onChange, label, fieldName }) => {
  const ref = field["x-vhrs-relatedResource"] || "";
  const resName = relatedFieldResourceName(ref);
  const target = (resources as any)[resName];
  const { data } = useRItem(target || { name: resName, baseUrl: `/${resName.toLowerCase()}/`, fields: {} } as any, {
    fetchOnDeclare: !!target,
  });
  const options = Array.isArray(data) ? data : [];
  return (
    <Autocomplete
      options={options}
      getOptionLabel={(o: any) => String(o.name || o.title || o.email || o.id)}
      value={options.find((o: any) => o.id === value) || null}
      onChange={(_e, v: any) => onChange(v?.id ?? null)}
      renderInput={(params) => <TextField {...params} label={label || field.title || fieldName} />}
    />
  );
};

export default RelatedFieldInput;
