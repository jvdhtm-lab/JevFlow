import React from "react";
import {
  Save, Edit, Delete, CheckCircle, Cancel, Info, Visibility,
  Add as AddIcon,
} from "@mui/icons-material";
import {
  TextField, Select, MenuItem, FormControl, InputLabel, Chip,
  Switch, FormControlLabel, Box, Typography, InputAdornment,
  Avatar, IconButton, Button,
} from "@mui/material";
import type { Action, AnnotatedResourceField, AnnotatedResourceFields, ResourceContext } from "@vhrs/resources";
import { renderStatusChip, STATUS_CONFIG, colors } from "./theme";
import RelatedFieldInput from "../components/Dynamics/RelatedFieldInput";
import RelatedFieldFilter from "../components/Dynamics/RelatedFieldFilter";

export const commonAnnotations: any = {
  id: {
    display: {
      components: {
        asTableCell: (data: any) => <span>#{data}</span>,
      },
    },
    sortable: true,
    filterable: true,
  },
  name: {
    sortable: true,
    filterable: true,
    display: {
      components: {
        asTableCell: (data: any) => <span>{String(data ?? "")}</span>,
        asFormInput: (data: any, ctx?: ResourceContext) => (
          <TextField
            label="Name"
            placeholder="Enter name"
            value={data || ''}
            onChange={(e) => ctx?.props.onChange(e.target.value)}
            fullWidth
          />
        ),
      },
    },
  },
  description: {
    filterable: true,
    display: {
      components: {
        asTableCell: (data: any) => <span>{String(data ?? "")}</span>,
        asFormInput: (data: any, ctx?: ResourceContext) => (
          <TextField
            label="Description"
            placeholder="Add a description…"
            multiline
            rows={4}
            value={data || ''}
            onChange={(e) => ctx?.props.onChange(e.target.value)}
            fullWidth
          />
        ),
      },
    },
  },
  status: {
    sortable: true,
    filterable: true,
    display: {
      components: {
        asFormInput: (data: any, ctx?: ResourceContext) => (
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={data || ''}
              onChange={(e) => ctx?.props.onChange(e.target.value)}
              label="Status"
              displayEmpty
              renderValue={(value) => (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {value === "activated" && <CheckCircle color="success" fontSize="small" />}
                  {value === "deactivated" && <Cancel color="error" fontSize="small" />}
                  {value === "pending" && <Info color="warning" fontSize="small" />}
                  {value === "confirmed" && <CheckCircle color="info" fontSize="small" />}
                  {value === "archived" && <Cancel color="disabled" fontSize="small" />}
                  {value}
                </span>
              )}
            >
              <MenuItem value="activated">Activated</MenuItem>
              <MenuItem value="deactivated">Deactivated</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
            </Select>
          </FormControl>
        ),
        asTableCell: (data: any) => {
          const cfg = (STATUS_CONFIG as any)[data];
          if (!cfg) return <span>{String(data ?? "")}</span>;
          return renderStatusChip(cfg);
        },
      },
    },
  },
  created_date_time: {
    sortable: true,
    display: {
      components: {
        asFormInput: (data: any, ctx?: ResourceContext) => (
          <TextField
            label="Created"
            type="datetime-local"
            value={data || ''}
            onChange={(e) => ctx?.props.onChange(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        ),
      },
    },
  },
};

// Action factories receive (data, ctx) — ctx carries saveItem/deleteItem
// from useRItem so table rows and forms persist through the same handlers.
export const defaultActions: Action[] = [
  (data?: any, ctx?: ResourceContext) => ({
    name: "save",
    title: "Save",
    icon: <Save fontSize="small" />,
    color: "primary",
    showInForm: true,
    useHandler: async () => {
      if (!data || !ctx?.saveItem) return;
      await ctx.saveItem(data.id ?? "", data);
    },
  }),
  (data?: any, _ctx?: ResourceContext) => ({
    name: "edit",
    title: "Edit",
    icon: <Edit fontSize="small" />,
    color: "primary",
    showInForm: false,
    useHandler: async () => {},
  }),
  (data?: any, ctx?: ResourceContext) => ({
    name: "delete",
    title: "Delete",
    icon: <Delete fontSize="small" />,
    color: "error",
    showInForm: true,
    useHandler: async () => {
      if (data?.id !== undefined && ctx?.deleteItem) {
        await ctx.deleteItem(data.id);
      }
    },
  }),
];

// Autocomplete filter for a related (FK / M2M) field. Resolves the target
// resource from the field's `x-vhrs-relatedResource` so it works anywhere.
export const relatedFieldAsFilter = (displayField?: string) => (data: any, ctx?: ResourceContext) => {
  const fieldName = ctx?.props?.fieldName;
  const fieldDef = (ctx?.resource?.fields as any)?.[fieldName];
  const related = fieldDef?.['x-vhrs-relatedResource'] || fieldDef?.items?.['x-vhrs-relatedResource'];
  const resourceName = related ? related.split('.').pop() : undefined;
  return (
    <RelatedFieldFilter
      resourceName={resourceName}
      value={data}
      onChange={(val) => ctx?.props.onChange(val)}
      displayField={displayField}
    />
  );
};

export function relatedFieldAnnotation(displayField?: string, formLabel?: string): any {
  return {
    display: {
      components: {
        asFormInput: (data: any, ctx?: ResourceContext) => (
          <RelatedFieldInput
            resource={ctx?.resource}
            fieldName={ctx?.props?.fieldName}
            value={data}
            onChange={(val) => ctx?.props.onChange(val)}
            displayField={displayField}
            label={formLabel}
          />
        ),
        // Cell rendering for related fields is handled resource-side by
        // DynamicTable/RelatedFieldCell, so it is intentionally not set here.
        asFilter: relatedFieldAsFilter(displayField),
      },
    },
    sortable: true,
    filterable: true,
  };
}

// JSON object field editor. Object values would otherwise render as
// "[object Object]" in a plain text input and fail backend validation on
// save — this keeps raw text while typing, parses on change, and only writes
// back valid JSON (empty clears to null).
const JsonTextEditor: React.FC<{
  label?: string;
  helper?: string;
  value: any;
  onChange: (v: any) => void;
}> = ({ label, helper, value, onChange }) => {
  const toText = (v: any) => (typeof v === "string" ? v : JSON.stringify(v ?? {}, null, 2));
  const [text, setText] = React.useState(() => toText(value));
  const [err, setErr] = React.useState("");
  const lastSeen = React.useRef<string>(toText(value));
  const current = toText(value);
  if (current !== lastSeen.current) {
    lastSeen.current = current;
    setText(current);
    if (err) setErr("");
  }
  return (
    <TextField
      fullWidth
      size="small"
      margin="normal"
      label={label || "JSON"}
      multiline
      minRows={4}
      value={text}
      error={!!err}
      helperText={err || helper}
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        if (!t.trim()) {
          onChange(null);
          setErr("");
          return;
        }
        try {
          onChange(JSON.parse(t));
          setErr("");
        } catch {
          setErr("Invalid JSON — fix before saving.");
        }
      }}
      InputProps={{ sx: { fontFamily: "monospace", fontSize: "0.8rem" } }}
    />
  );
};

export function jsonFieldAnnotation(label?: string, helper?: string): any {
  return {
    display: {
      components: {
        asFormInput: (value: any, ctx: any) => (
          <JsonTextEditor
            label={label}
            helper={helper}
            value={value}
            onChange={(v: any) => {
              if (ctx?.set) ctx.set(v);
              else ctx?.props?.onChange?.(v);
            }}
          />
        ),
      },
    },
  };
}

export const titleCase = (s?: string) =>
  s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';

export const extractTitle = (node: any): string => {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (React.isValidElement(node)) {
    const props = node.props as Record<string, any>;
    if (props.children) return extractTitle(props.children);
  }
  if (Array.isArray(node)) return node.map(extractTitle).join('');
  return '';
};

// Generic, theme-aware card for a resource: icon + title header, then the
// resource's own table columns (reusing each field's asTableCell so chips,
// status colors, related labels, etc. stay consistent).
export const defaultResourceCard = (data?: any, ctx?: ResourceContext) => {
  const resource = ctx?.resource;
  if (!resource || !data) return null;

  const comps: any = resource.display?.components || {};
  const fields: any = resource.fields || {};
  const title = comps.asTitle?.(data, ctx) ?? resource.name;
  const icon = comps.asIcon?.(data, ctx);
  const accent = comps.asColor?.(data, ctx) || colors.primary.main;

  const columns: string[] = resource.tableColumns?.length
    ? resource.tableColumns
    : Object.keys(fields).filter((f) => !fields[f]?.readOnly);
  const rows = columns.filter((f) => fields[f] && f !== 'id').slice(1, 7);

  const cardValue = (value: any) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'object') return value.name ?? value.title ?? value.label ?? '—';
    return String(value);
  };

  return (
    <Box sx={{ display: 'flex', gap: 1.75 }}>
      <Box sx={{ width: 4, borderRadius: 1, bgcolor: accent, flexShrink: 0 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, flexGrow: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: `${accent}1A`, color: accent, width: 46, height: 46 }}>
            {icon}
          </Avatar>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, minWidth: 0 }} noWrap>
            {title}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {rows.map((field) => {
            const def = fields[field];
            const value = data?.[field];
            const cell =
              def.display?.components?.asTableCell?.(value, { ...ctx, row: data }) ??
              cardValue(value);
            return (
              <Box
                key={field}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  py: 0.75,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-of-type': { borderBottom: 'none' },
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                  {def.title || field}
                </Typography>
                <Box sx={{ textAlign: 'right', minWidth: 0, overflow: 'hidden' }}>{cell}</Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export const createSelectAnnotation = (
  fieldName: string,
  options: SelectOption[],
  defaultValue?: string,
): AnnotatedResourceField => ({
  display: {
    components: {
      asFormInput: (data: any, ctx?: ResourceContext) => (
        <FormControl fullWidth variant="outlined" size="small">
          <InputLabel>{titleCase(fieldName)}</InputLabel>
          <Select
            label={titleCase(fieldName)}
            value={data || defaultValue || options[0]?.value || ''}
            onChange={(e) => ctx?.props.onChange(e.target.value)}
          >
            {options.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.icon && <Box component="span" sx={{ mr: 1, display: 'inline-flex', verticalAlign: 'middle' }}>{o.icon}</Box>}
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ),
      asTableCell: (data: any) => (
        <Chip
          label={options.find((o) => o.value === data)?.label || data}
          size="small"
          variant="outlined"
        />
      ),
      asFilter: (data: any, ctx?: ResourceContext) => (
        <FormControl fullWidth size="small">
          <Select
            value={data ?? ''}
            onChange={(e) => ctx?.props.onChange(e.target.value === '' ? undefined : e.target.value)}
            displayEmpty
          >
            <MenuItem value=""><em>All</em></MenuItem>
            {options.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.icon && <Box component="span" sx={{ mr: 1, display: 'inline-flex', verticalAlign: 'middle' }}>{o.icon}</Box>}
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ),
    },
  },
  sortable: true,
  filterable: true,
});

export const createStatusSelectAnnotation = (): AnnotatedResourceField => ({
  display: {
    components: {
      asFormInput: (data: any, ctx?: ResourceContext) => {
        const currentValue = data || 'activated';
        return (
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={currentValue}
              onChange={(e) => ctx?.props.onChange(e.target.value)}
            >
              {Object.entries(STATUS_CONFIG).map(([value, cfg]) => (
                <MenuItem key={value} value={value}>
                  {renderStatusChip(cfg)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      },
      asTableCell: (data: any) => {
        const cfg = (STATUS_CONFIG as any)[data];
        return cfg ? renderStatusChip(cfg) : <span>{String(data ?? '')}</span>;
      },
      asFilter: (data: any, ctx?: ResourceContext) => (
        <FormControl fullWidth size="small">
          <Select
            value={data ?? ''}
            onChange={(e) => ctx?.props.onChange(e.target.value === '' ? undefined : e.target.value)}
            displayEmpty
          >
            <MenuItem value=""><em>All</em></MenuItem>
            {Object.entries(STATUS_CONFIG).map(([value, cfg]) => (
              <MenuItem key={value} value={value}>
                {renderStatusChip(cfg)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ),
    },
  },
  sortable: true,
  filterable: true,
});

// Reusable boolean field annotation (Switch)
export const createBooleanAnnotation = (
  label: string,
): AnnotatedResourceField => ({
  display: {
    components: {
      asTitle: (data: any) => (
        <Chip
          label={data ? 'Yes' : 'No'}
          size="small"
          color={data ? 'success' : 'default'}
          variant={data ? 'filled' : 'outlined'}
          sx={{ height: 22, fontWeight: 600 }}
        />
      ),
      asTableCell: (data: any) => (
        <>{data ? <CheckCircle color="success" fontSize="small" /> : <Cancel color="disabled" fontSize="small" />}</>
      ),
      asFilter: (data: any, ctx?: ResourceContext) => (
        <FormControl fullWidth size="small">
          <Select
            value={data === undefined ? '' : String(data)}
            onChange={(e) => ctx?.props.onChange(e.target.value === '' ? undefined : e.target.value === 'true')}
            displayEmpty
          >
            <MenuItem value=""><em>All</em></MenuItem>
            <MenuItem value="true">Yes</MenuItem>
            <MenuItem value="false">No</MenuItem>
          </Select>
        </FormControl>
      ),
      asFormInput: (data: any, ctx?: ResourceContext) => (
        <FormControlLabel
          control={
            <Switch
              checked={!!data}
              onChange={(e) => ctx?.props.onChange(e.target.checked)}
              color="success"
            />
          }
          label={label}
        />
      ),
    },
  },
  sortable: true,
  filterable: true,
});

// Reusable date field annotation
export const createDateAnnotation = (
  label: string,
): AnnotatedResourceField => ({
  display: {
    components: {
      asTitle: (data: any) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
          {data ? new Date(data).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '\u2014'}
        </Typography>
      ),
      asTableCell: (data: any) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
          {data ? new Date(data).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '\u2014'}
        </Typography>
      ),
      asFilter: (data: any, ctx?: ResourceContext) => (
        <TextField
          type="date"
          size="small"
          fullWidth
          value={data || ''}
          onChange={(e) => ctx?.props.onChange(e.target.value === '' ? undefined : e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      ),
      asFormInput: (data: any, ctx?: ResourceContext) => {
        const toLocal = (dt: string | undefined): string => {
          if (!dt) return '';
          const d = new Date(dt);
          const pad = (n: number) => String(n).padStart(2, '0');
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        };
        return (
          <TextField
            label={label}
            type="date"
            size="small"
            fullWidth
            value={toLocal(data)}
            onChange={(e) => ctx?.props.onChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        );
      },
    },
  },
  sortable: true,
  filterable: true,
});

// Reusable datetime field annotation
export const createDateTimeAnnotation = (
  label: string,
): AnnotatedResourceField => ({
  display: {
    components: {
      asTitle: (data: any) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
          {data ? new Date(data).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '\u2014'}
        </Typography>
      ),
      asTableCell: (data: any) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
          {data ? new Date(data).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '\u2014'}
        </Typography>
      ),
      asFilter: (data: any, ctx?: ResourceContext) => (
        <TextField
          type="date"
          size="small"
          fullWidth
          value={data || ''}
          onChange={(e) => ctx?.props.onChange(e.target.value === '' ? undefined : e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      ),
      asFormInput: (data: any, ctx?: ResourceContext) => {
        const toLocal = (dt: string | undefined): string => {
          if (!dt) return '';
          const d = new Date(dt);
          const pad = (n: number) => String(n).padStart(2, '0');
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };
        return (
          <TextField
            label={label}
            type="datetime-local"
            size="small"
            fullWidth
            value={toLocal(data)}
            onChange={(e) => ctx?.props.onChange(new Date(e.target.value).toISOString())}
            InputLabelProps={{ shrink: true }}
          />
        );
      },
    },
  },
  sortable: true,
  filterable: true,
});

// Reusable number field annotation
export const createNumberAnnotation = (
  label: string,
  options?: { min?: number; max?: number; prefix?: string; suffix?: string },
): AnnotatedResourceField => ({
  display: {
    components: {
      asTitle: (data: any) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          {options?.prefix || ''}{data ?? '\u2014'}{options?.suffix || ''}
        </Typography>
      ),
      asTableCell: (data: any) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
          {options?.prefix || ''}{data ?? '\u2014'}{options?.suffix || ''}
        </Typography>
      ),
      asFormInput: (data: any, ctx?: ResourceContext) => (
        <TextField
          label={label}
          type="number"
          size="small"
          fullWidth
          value={data ?? ''}
          onChange={(e) => ctx?.props.onChange(e.target.value === '' ? null : Number(e.target.value))}
          inputProps={{ min: options?.min, max: options?.max }}
          InputProps={{
            startAdornment: options?.prefix ? <InputAdornment position="start">{options.prefix}</InputAdornment> : undefined,
            endAdornment: options?.suffix ? <InputAdornment position="end">{options.suffix}</InputAdornment> : undefined,
          }}
        />
      ),
    },
  },
  sortable: true,
  filterable: true,
});
