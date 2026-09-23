import { Box } from "@mui/material";
import DynamicTable from "../Dynamics/DynamicTable";
import { resources } from "@vhrs/resources";

const UserTable = (props: any) => (
  <Box sx={{ p: 3 }}>
    <DynamicTable
      resource={resources.User}
      includeHeader={['email', 'first_name', 'last_name', 'auth_provider', 'is_active']}
      {...props}
    />
  </Box>
);

export default UserTable;
