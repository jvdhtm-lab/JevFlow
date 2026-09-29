import { Box } from "@mui/material";
import DynamicForm from "../Dynamics/DynamicForm";
import { resources } from "@vhrs/resources";

const IntegrationForm = (props: any) => (
  <Box sx={{ p: 3 }}>
    <DynamicForm resource={resources.Integration} {...props} />
  </Box>
);

export default IntegrationForm;
