import React, { useState } from "react";
import { Box, Button, TextField, MenuItem } from "@mui/material";
import { ResourceObject } from "@vhrs/resources";
import { useRItem } from "../hooks/useRItem";
import RelatedFieldInput from "./RelatedFieldInput";

function extractTitle(t: unknown): string {
  if (typeof t === "string") return t;
  if (t && typeof (t as any)?.props?.children === "string") return (t as any).props.children;
  return "Save";
}

interface Props {
  resource: ResourceObject;
  includeFields?: string[];
  mode?: "create" | "edit";
  initialData?: any;
  auth?: any;
  onSave?: (data?: any) => void;
}

const DynamicForm: React.FC<Props> = ({ resource, includeFields, initialData, auth, onSave }) => {
  const fields = includeFields || Object.keys(resource.fields).filter((k) => !resource.fields[k]?.readOnly);
  const [form, setForm] = useState<any>(initialData || {});
  // No auto-fetch here — the parent table/page owns list fetching; this only
  // provides real save/delete handlers to resource actions.
  const { saveItem, deleteItem, createItem } = useRItem(resource, { fetchOnDeclare: false });
  const ctx = { resource, props: {}, auth, saveItem, deleteItem, createItem };
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const handleSubmit = async (e?: React.FormEvent, action?: any) => {
    if (e) e.preventDefault();
    if (action) {
      await action(form, ctx)?.useHandler?.();
    } else {
      const acts = resource.actions || [];
      const save = acts.map((a: any) => a(form, ctx)).find((a: any) => a.name === "save");
      await save?.useHandler?.();
    }
    onSave?.(form);
  };

  return (
    <Box component="form" onSubmit={(e) => handleSubmit(e)} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {fields.map((name) => {
        const f = resource.fields[name];
        if (!f) return null;
        // Per-field form input override, annotated on the field itself:
        //   <field>: { display: { components: { asFormInput: (value, { field, set }) => ... } } }
        // (same level as asTableCell/asFilter, which DynamicTable resolves
        // from field.display.components).
        const asFormInput = (f as any)?.display?.components?.asFormInput;
        if (asFormInput) return <Box key={name}>{asFormInput(form[name], { field: f, set: (v: any) => set(name, v) })}</Box>;
        if ((f as any)["x-vhrs-relatedResource"]) {
          return <RelatedFieldInput key={name} fieldName={name} field={f} value={form[name]} onChange={(v) => set(name, v)} />;
        }
        if (f.enum) {
          return (
            <TextField key={name} select label={f.title || name} value={form[name] || ""} onChange={(e) => set(name, e.target.value)}>
              {f.enum.map((o: string) => (
                <MenuItem key={o} value={o}>
                  {o}
                </MenuItem>
              ))}
            </TextField>
          );
        }
        return (
          <TextField
            key={name}
            label={f.title || name}
            type={f.format === "date" ? "date" : f.type === "number" || f.type === "integer" ? "number" : "text"}
            value={form[name] ?? ""}
            onChange={(e) => set(name, e.target.value)}
            InputLabelProps={f.format === "date" ? { shrink: true } : undefined}
          />
        );
      })}
      <Box sx={{ display: "flex", gap: 1 }}>
        {(resource.actions || []).filter((a: any) => a(form, ctx).showInForm).map((a: any, i: number) => {
          const p = a(form, ctx);
          return (
            <Button key={i} variant="contained" color={p.color || "primary"} startIcon={p.icon} onClick={(e) => handleSubmit(e, a)}>
              {extractTitle(p.title) || p.name}
            </Button>
          );
        })}
        {(!resource.actions || !resource.actions.length) && (
          <Button type="submit" variant="contained">
            Save
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default DynamicForm;
