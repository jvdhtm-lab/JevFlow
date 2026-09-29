import { Box } from "@mui/material";
import DynamicForm from "../Dynamics/DynamicForm";
import { resources } from "@vhrs/resources";

const ApprovalRequestForm = (props: any) => (
  <Box sx={{ p: 3 }}>
    <DynamicForm resource={resources.ApprovalRequest} {...props} />
  </Box>
);

export default ApprovalRequestForm;
