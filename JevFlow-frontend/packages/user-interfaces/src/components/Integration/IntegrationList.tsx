import { Box } from "@mui/material";
import DynamicList from "../Dynamics/DynamicList";
import { resources } from "@vhrs/resources";

const IntegrationList = (props: any) => (
  <Box sx={{ p: 3 }}>
    <DynamicList
      resource={resources.Integration}
      includeFields={['name', 'integration_type', 'connection_status']}
      {...props}
    />
  </Box>
);

export default IntegrationList;
