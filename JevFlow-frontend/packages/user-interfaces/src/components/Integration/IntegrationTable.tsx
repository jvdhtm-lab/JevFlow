import { Box } from "@mui/material";
import DynamicTable from "../Dynamics/DynamicTable";
import { resources } from "@vhrs/resources";

const IntegrationTable = (props: any) => (
  <Box sx={{ p: 3 }}>
    <DynamicTable
      resource={resources.Integration}
      includeHeader={['name', 'integration_type', 'purpose', 'connection_status', 'updated_date_time']}
      {...props}
    />
  </Box>
);

export default IntegrationTable;
