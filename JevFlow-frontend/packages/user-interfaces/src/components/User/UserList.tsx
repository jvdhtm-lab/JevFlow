import { Box } from "@mui/material";
import DynamicList from "../Dynamics/DynamicList";
import { resources } from "@vhrs/resources";

const UserList = (props: any) => (
  <Box sx={{ p: 3 }}>
    <DynamicList
      resource={resources.User}
      includeFields={['email', 'auth_provider', 'is_active']}
      {...props}
    />
  </Box>
);

export default UserList;
