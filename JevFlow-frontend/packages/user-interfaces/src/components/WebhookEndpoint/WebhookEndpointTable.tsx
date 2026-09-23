import { Box } from "@mui/material";
import DynamicTable from "../Dynamics/DynamicTable";
import { resources } from "@vhrs/resources";

const WebhookEndpointTable = (props: any) => (
  <Box sx={{ p: 3 }}>
    <DynamicTable
      resource={resources.WebhookEndpoint}
      includeHeader={['direction', 'source', 'inbound_url', 'outbound_url', 'is_active']}
      {...props}
    />
  </Box>
);

export default WebhookEndpointTable;
