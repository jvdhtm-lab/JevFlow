import { Box } from "@mui/material";
import DynamicTable from "../Dynamics/DynamicTable";
import { resources } from "@vhrs/resources";

const ApprovalRequestTable = (props: any) => (
  <Box sx={{ p: 3 }}>
    <DynamicTable
      resource={resources.ApprovalRequest}
      includeHeader={['summary', 'status', 'node_key', 'map', 'decided_at']}
      {...props}
    />
  </Box>
);

export default ApprovalRequestTable;
