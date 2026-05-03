import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, requiredRole, requiredPermission }) {
  const token = sessionStorage.getItem("accessToken");
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const userRole = sessionStorage.getItem("userRole");

  if (requiredRole && userRole && userRole !== requiredRole) {
    if (userRole === "client") {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/employees" replace />;
  }

  if (requiredPermission) {
    let permissions = [];
    try {
      permissions = JSON.parse(sessionStorage.getItem("permissions") || "[]");
    } catch {
      permissions = [];
    }

    // The synthetic `admin` permission bypasses every secured(...) check on
    // the gateway, so the frontend mirrors that here. Without this, an admin
    // (whose record only carries "admin" + "supervisor") would be locked out
    // of routes gated on "manage_clients", "manage_employees", etc.
    const allowed =
      permissions.includes("admin") || permissions.includes(requiredPermission);
    if (!allowed) {
      if (userRole === "client") {
        return <Navigate to="/dashboard" replace />;
      }
      // Falling back to a guaranteed-accessible page so we don't loop into
      // the same redirect (e.g. an agent denied at /employees would otherwise
      // be bounced right back to /employees).
      return <Navigate to="/securities" replace />;
    }
  }

  return children;
}
