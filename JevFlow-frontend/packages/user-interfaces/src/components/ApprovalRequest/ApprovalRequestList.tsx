import { Box } from "@mui/material";
import DynamicList from "../Dynamics/DynamicList";
import { resources } from "@vhrs/resources";

const ApprovalRequestList = (props: any) => (
  <Box sx={{ p: 3 }}>
    <DynamicList
      resource={resources.ApprovalRequest}
      includeFields={['node_key', 'status', 'map']}
      {...props}
    />
  </Box>
);

export default ApprovalRequestList;
