import { Box } from "@mui/material";
import DynamicForm from "../Dynamics/DynamicForm";
import { resources } from "@vhrs/resources";

const WebhookEndpointForm = (props: any) => (
  <Box sx={{ p: 3 }}>
    <DynamicForm resource={resources.WebhookEndpoint} {...props} />
  </Box>
);

export default WebhookEndpointForm;
