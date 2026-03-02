import { Navigate } from "react-router-dom";
import { getCurrentRole } from "../utils/auth";

// Guards routes based on user role.
function ProtectedRoute({ allowedRole, children }) {
  const currentRole = getCurrentRole();

  if (!currentRole) {
    return <Navigate to="/login" replace />;
  }

  if (currentRole !== allowedRole) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
