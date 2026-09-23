import { Box } from "@mui/material";
import DynamicList from "../Dynamics/DynamicList";
import { resources } from "@vhrs/resources";

const WebhookEndpointList = (props: any) => (
  <Box sx={{ p: 3 }}>
    <DynamicList
      resource={resources.WebhookEndpoint}
      includeFields={['direction', 'source', 'is_active']}
      {...props}
    />
  </Box>
);

export default WebhookEndpointList;
