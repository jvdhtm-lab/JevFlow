import React from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "./theme";
import { DataCacheProvider } from "./context/DataCache";
import { AuthProvider } from "./context/AuthContext";

const App: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <DataCacheProvider>
      <AuthProvider>{children}</AuthProvider>
    </DataCacheProvider>
  </ThemeProvider>
);

export default App;
