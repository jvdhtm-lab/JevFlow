import { Box } from "@mui/material";
import DynamicList from "../Dynamics/DynamicList";
import { resources } from "@vhrs/resources";

const ApprovalToolList = (props: any) => (
  <Box sx={{ p: 3 }}>
    <DynamicList
      resource={resources.ApprovalTool}
      includeFields={['name', 'tool_type', 'via', 'status']}
      {...props}
    />
  </Box>
);

export default ApprovalToolList;
