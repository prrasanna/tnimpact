import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminDashboard from "./pages/AdminDashboard";
import CreateAccount from "./pages/CreateAccount";
import DeliveryDashboard from "./pages/DeliveryDashboard";
import DeliveryRoute from "./pages/DeliveryRoute";
import DeliverySettings from "./pages/DeliverySettings";
import MyDeliveries from "./pages/mydeliveries";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import WarehouseDashboard from "./pages/WarehouseDashboard";
import { applyTheme, getStoredTheme } from "./utils/theme";

// Main app router and global state.
function App() {
  const [theme, setTheme] = useState(getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={<Home theme={theme} onToggleTheme={handleToggleTheme} />}
        />
        <Route path="/create-account" element={<CreateAccount />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="Admin">
              <AdminDashboard theme={theme} onToggleTheme={handleToggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/warehouse"
          element={
            <ProtectedRoute allowedRole="Warehouse Staff">
              <WarehouseDashboard
                theme={theme}
                onToggleTheme={handleToggleTheme}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery"
          element={
            <ProtectedRoute allowedRole="delivery">
              <DeliveryDashboard
                theme={theme}
                onToggleTheme={handleToggleTheme}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery/my-deliveries"
          element={
            <ProtectedRoute allowedRole="delivery">
              <MyDeliveries theme={theme} onToggleTheme={handleToggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery/route"
          element={
            <ProtectedRoute allowedRole="delivery">
              <DeliveryRoute theme={theme} onToggleTheme={handleToggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery/settings"
          element={
            <ProtectedRoute allowedRole="delivery">
              <DeliverySettings
                theme={theme}
                onToggleTheme={handleToggleTheme}
              />
            </ProtectedRoute>
          }
        />

        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <Toaster position="top-right" />
    </>
  );
}

export default App;
