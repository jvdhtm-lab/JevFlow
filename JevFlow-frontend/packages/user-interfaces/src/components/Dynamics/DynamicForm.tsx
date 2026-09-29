import React, { useEffect, useState } from "react";
import {
  Box, Button, TextField, MenuItem, Alert, Switch, FormControlLabel,
  FormControl, InputLabel, Select,
} from "@mui/material";
import { ResourceObject } from "@vhrs/resources";
import { useRItem } from "../hooks/useRItem";
import RelatedFieldInput from "./RelatedFieldInput";

function extractTitle(t: unknown): string {
  if (typeof t === "string") return t;
  if (t && typeof (t as any)?.props?.children === "string") return (t as any).props.children;
  return "Save";
}

function parseBackendErrors(err: any): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  if (err?.response?.data) {
    const data = err.response.data;
    if (typeof data === "object" && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value)) {
          errors[key] = value as string[];
        } else if (typeof value === "string") {
          errors[key] = [value];
        }
      }
    } else if (typeof data === "string") {
      errors["non_field_errors"] = [data];
    }
  } else if (err?.message) {
    errors["non_field_errors"] = [err.message];
  }
  return errors;
}

interface Props {
  resource: ResourceObject;
  includeFields?: string[];
  mode?: "create" | "edit" | "normal" | "two-col" | "three-col";
  initialData?: any;
  auth?: any;
  hideFooter?: boolean;
  formId?: string;
  onSave?: (data?: any) => void;
}

const DynamicForm: React.FC<Props> = ({
  resource,
  includeFields,
  mode,
  initialData,
  auth,
  hideFooter,
  formId,
  onSave,
}) => {
  const fields = includeFields || Object.keys(resource.fields).filter((k) => !resource.fields[k]?.readOnly);
  const [form, setForm] = useState<any>(initialData || {});
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string>("");

  // Resync when a different record is loaded into the same mounted form
  // (e.g. editing another table row) — VHRS parity.
  useEffect(() => {
    setForm(initialData || {});
    setFormErrors({});
    setGeneralError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  // No auto-fetch here — the parent table/page owns list fetching; this only
  // provides real save/delete handlers to resource actions.
  const { saveItem, deleteItem, createItem } = useRItem(resource, { fetchOnDeclare: false });
  const ctx = { resource, props: {}, auth, saveItem, deleteItem, createItem };

  const clearFieldError = (k: string) => {
    if (formErrors[k]) {
      setFormErrors((p: any) => {
        const n = { ...p };
        delete n[k];
        return n;
      });
    }
  };

  const set = (k: string, v: any) => {
    setForm((p: any) => ({ ...p, [k]: v }));
    clearFieldError(k);
  };

  const setField = (k: string, v: any) => set(k, v);

  const handleSubmit = async (e?: React.FormEvent, action?: any) => {
    if (e) e.preventDefault();
    setFormErrors({});
    setGeneralError("");
    const callCtx = { ...ctx, form, set, setField };
    try {
      if (action) {
        await action(form, callCtx)?.useHandler?.();
      } else {
        const acts = resource.actions || [];
        const save = acts.map((a: any) => a(form, callCtx)).find((a: any) => a.name === "save");
        await save?.useHandler?.();
      }
      onSave?.(form);
    } catch (err: any) {
      const parsed = parseBackendErrors(err);
      const nonField = parsed["non_field_errors"];
      if (nonField) {
        setGeneralError(nonField.join(" "));
        delete parsed["non_field_errors"];
      }
      setFormErrors(parsed);
    }
  };

  return (
    <Box component="form" id={formId} onSubmit={(e) => handleSubmit(e)} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {generalError && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setGeneralError("")}>
          {generalError}
        </Alert>
      )}
      {fields.map((name) => {
        const f = resource.fields[name];
        if (!f) return null;
        const fieldError = formErrors[name]?.[0];
        // Per-field form input override, annotated on the field itself:
        //   <field>: { display: { components: { asFormInput: (value, { field, set, form, setField }) => ... } } }
        const asFormInput = (f as any)?.display?.components?.asFormInput;
        if (asFormInput) {
          const rendered = asFormInput(form[name], {
            field: f,
            set: (v: any) => set(name, v),
            form,
            setField,
            resource,
            props: { fieldName: name, onChange: (v: any) => set(name, v) },
            auth,
          });
          if (rendered === null || rendered === undefined) return null;
          return <Box key={name}>{rendered}</Box>;
        }
        if ((f as any)["x-vhrs-relatedResource"]) {
          return (
            <RelatedFieldInput
              key={name}
              fieldName={name}
              field={f}
              value={form[name]}
              onChange={(v) => set(name, v)}
              error={!!fieldError}
              helperText={fieldError}
            />
          );
        }
        if (f.enum) {
          return (
            <FormControl key={name} fullWidth variant="outlined" size="small" error={!!fieldError}>
              <InputLabel>{f.title || name}</InputLabel>
              <Select
                label={f.title || name}
                value={form[name] || ""}
                onChange={(e) => set(name, e.target.value)}
              >
                {f.enum.map((o: string) => (
                  <MenuItem key={o} value={o}>
                    {o}
                  </MenuItem>
                ))}
              </Select>
              {fieldError && <Box sx={{ color: 'error.main', typography: 'caption', mt: 0.5, ml: 1.5 }}>{fieldError}</Box>}
            </FormControl>
          );
        }
        if (f.type === "boolean") {
          return (
            <FormControl key={name} fullWidth error={!!fieldError}>
              <FormControlLabel
                control={
                  <Switch
                    checked={!!form[name]}
                    onChange={(e) => set(name, e.target.checked)}
                  />
                }
                label={f.title || name}
              />
              {fieldError && <Box sx={{ color: 'error.main', typography: 'caption', mt: 0.5, ml: 1.5 }}>{fieldError}</Box>}
            </FormControl>
          );
        }
        if (name === "password" || f.format === "password") {
          return (
            <TextField
              key={name}
              fullWidth
              size="small"
              label={f.title || name}
              type="password"
              value={form[name] || ""}
              onChange={(e) => set(name, e.target.value)}
              error={!!fieldError}
              helperText={fieldError}
            />
          );
        }
        if (f.format === "email") {
          return (
            <TextField
              key={name}
              fullWidth
              size="small"
              label={f.title || name}
              type="email"
              value={form[name] || ""}
              onChange={(e) => set(name, e.target.value)}
              error={!!fieldError}
              helperText={fieldError}
            />
          );
        }
        if (f.format === "date-time") {
          return (
            <TextField
              key={name}
              fullWidth
              size="small"
              label={f.title || name}
              type="datetime-local"
              value={form[name] || ""}
              onChange={(e) => set(name, e.target.value)}
              InputLabelProps={{ shrink: true }}
              error={!!fieldError}
              helperText={fieldError}
            />
          );
        }
        if (f.format === "date") {
          return (
            <TextField
              key={name}
              fullWidth
              size="small"
              label={f.title || name}
              type="date"
              value={form[name] || ""}
              onChange={(e) => set(name, e.target.value)}
              InputLabelProps={{ shrink: true }}
              error={!!fieldError}
              helperText={fieldError}
            />
          );
        }
        if (f.type === "integer") {
          return (
            <TextField
              key={name}
              fullWidth
              size="small"
              label={f.title || name}
              type="number"
              value={form[name] ?? ""}
              onChange={(e) => set(name, e.target.value === "" ? null : Number(e.target.value))}
              error={!!fieldError}
              helperText={fieldError}
            />
          );
        }
        return (
          <TextField
            key={name}
            fullWidth
            size="small"
            label={f.title || name}
            type={f.type === "number" ? "number" : "text"}
            value={form[name] ?? ""}
            onChange={(e) => set(name, e.target.value)}
            error={!!fieldError}
            helperText={fieldError}
          />
        );
      })}
      {!hideFooter && (
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
      )}
    </Box>
  );
};

export default DynamicForm;
