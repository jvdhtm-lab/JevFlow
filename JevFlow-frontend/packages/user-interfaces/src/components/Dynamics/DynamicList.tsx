import React from "react";
import { Box, CircularProgress, List, ListItem, ListItemText, Typography } from "@mui/material";
import { ResourceObject, ResourceOptions } from "@vhrs/resources";
import { useRItem } from "../hooks/useRItem";

interface DynamicListProps {
  resource: ResourceObject;
  includeFields?: string[];
  auth?: any;
  options?: ResourceOptions;
  // Client-side row filter for dimensions the API can't express.
  // Only honored here — pair with hideTable on ResourcePage.
  itemFilter?: (item: any) => boolean;
}

const DynamicList: React.FC<DynamicListProps> = ({
  resource,
  includeFields,
  auth,
  options,
  itemFilter,
}) => {
  void auth;
  const { data, isLoading, error } = useRItem(resource, options);
  const fields = includeFields || Object.keys(resource.fields).slice(0, 3);
  const asItem = (resource.display as any)?.components?.asListItem;
  const rows = (Array.isArray(data) ? data : []).filter((row: any) =>
    itemFilter ? itemFilter(row) : true
  );

  if (isLoading && !data) return <Box p={2}><CircularProgress size={20} /></Box>;
  if (error) return <Box p={2}>Error: {(error as any)?.message}</Box>;

  return (
    <List>
      {rows.map((row: any) => (
        <ListItem key={row.id}>
          {asItem ? asItem(row) : <ListItemText primary={String(row[fields[0]] ?? row.id)} secondary={fields.slice(1).map((f) => String(row[f] ?? "")).join(" · ")} />}
        </ListItem>
      ))}
      {rows.length === 0 && (
        <Typography sx={{ p: 2 }} color="text.secondary">
          No rows
        </Typography>
      )}
    </List>
  );
};

export default DynamicList;
