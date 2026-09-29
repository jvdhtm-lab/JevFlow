import type { ReactNode } from "react";

// Re-exported here so generated resource files can type their mockType as
// Models["<Name>"] via `import type { Models } from "../../types"`.
export type { definitions as Models } from "../servers/types/Models";

export interface DisplayComponent {
  (data?: any, ctx?: any): any;
}

export interface Display {
  components?: Record<string, DisplayComponent>;
}

export type Colors =
  | "inherit"
  | "primary"
  | "secondary"
  | "success"
  | "error"
  | "info"
  | "warning";

export interface ResourceContext {
  resource: ResourceObject;
  props: any;
  auth?: any;
  saveItem?: (id: string | number, data: any) => Promise<any>;
  createItem?: (data: any) => Promise<any>;
  deleteItem?: (id: string | number) => Promise<any>;
  row?: any;
}

export interface ActionPropType {
  useHandler?: () => Promise<void> | void;
  route?: () => string;
  redirect?: string;
  name: string;
  title: string;
  icon?: ReactNode;
  color?: Colors;
  className?: string;
  disable?: boolean;
  hidden?: boolean;
  showInForm?: boolean;
}

export type Action = (data?: any, ctx?: ResourceContext) => ActionPropType;

export type EnumItem = {
  id: number | string;
  text: string;
};

export interface ResourceField {
  title?: string;
  type?: string;
  readOnly?: boolean;
  maxLength?: number;
  format?: string;
  enum?: string[];
  enumItems?: EnumItem[] | string[];
  display?: Display;
  filterable?: boolean;
  sortable?: boolean;
  searchable?: boolean;
  [key: string]: any;
}

export interface AnnotatedResourceField extends ResourceField {
  multiple?: boolean;
  chip?: boolean;
  itemValue?: string;
  serializeFunc?: (value: any, field: AnnotatedResourceField) => any;
}

export type AnnotatedResourceFields<T = any> = {
  [key: string]: AnnotatedResourceField;
} & Partial<Record<keyof T, AnnotatedResourceField>>;

export interface ResourceMetaType {
  resourceNameSingular?: string;
  resourceNamePlural?: string;
}

export interface ResourceObject {
  baseUrl: string;
  name: string;
  fields: Record<string, ResourceField>;
  relatedurls?: string[];
  required?: string[];
  actions?: Action[];
  display?: Display;
  menu?: any[];
  tableColumns?: string[];
  meta?: ResourceMetaType;
  [key: string]: any;
}

export interface ResourceOptions {
  url?: string;
  params?: { name: string; value: string }[];
  filter?: Record<string, string | number | boolean>;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string[];
  force?: boolean;
  headers?: any;
  forceNoDedup?: boolean;
  fetchOnDeclare?: boolean;
  forceFetchOnNavigation?: boolean;
  forceFetchOnWinBlur?: boolean;
}
