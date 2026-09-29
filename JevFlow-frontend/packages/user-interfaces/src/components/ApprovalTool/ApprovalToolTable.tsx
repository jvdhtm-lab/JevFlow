import { Box } from "@mui/material";
import DynamicTable from "../Dynamics/DynamicTable";
import { resources } from "@vhrs/resources";

const ApprovalToolTable = (props: any) => (
  <Box sx={{ p: 3 }}>
    <DynamicTable
      resource={resources.ApprovalTool}
      includeHeader={['name', 'tool_type', 'via', 'status', 'updated_date_time']}
      {...props}
    />
  </Box>
);

export default ApprovalToolTable;
