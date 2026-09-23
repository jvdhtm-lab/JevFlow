import React from "react";
import { Save, Edit, Delete } from "@mui/icons-material";
import type { Action, ResourceContext } from "@vhrs/resources";
import { renderStatusChip, STATUS_CONFIG } from "./theme";

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
      },
    },
  },
  description: {
    filterable: true,
    display: {
      components: {
        asTableCell: (data: any) => <span>{String(data ?? "")}</span>,
      },
    },
  },
  status: {
    sortable: true,
    filterable: true,
    display: {
      components: {
        asTableCell: (data: any) => {
          const cfg = (STATUS_CONFIG as any)[data];
          if (!cfg) return <span>{String(data ?? "")}</span>;
          return renderStatusChip(cfg);
        },
      },
    },
  },
  created_date_time: { sortable: true },
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

export function relatedFieldAnnotation(_resource?: string, formLabel?: string): any {
  return { display: { components: { asFormLabel: () => <span>{formLabel || "Related"}</span> } } };
}
