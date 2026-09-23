import { Box } from "@mui/material";
import DynamicForm from "../Dynamics/DynamicForm";
import { resources } from "@vhrs/resources";

const UserForm = (props: any) => (
  <Box sx={{ p: 3 }}>
    <DynamicForm resource={resources.User} {...props} />
  </Box>
);

export default UserForm;
