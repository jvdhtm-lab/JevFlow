import { Box } from "@mui/material";
import DynamicForm from "../Dynamics/DynamicForm";
import { resources } from "@vhrs/resources";

const ApprovalToolForm = (props: any) => (
  <Box sx={{ p: 3 }}>
    <DynamicForm resource={resources.ApprovalTool} {...props} />
  </Box>
);

export default ApprovalToolForm;
