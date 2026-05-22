import {Navigate, Outlet, useLocation} from 'react-router-dom';
import {useAuth} from "../../context/AuthContext";

export default function ProtectedRoute({ allowedRoles }) {
    const {isAuthenticated, isLoading, user} = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
            </div>
        );
    }

    //if user isn't logged in redirect to /login AND save where he wanted to go (state from location)
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{from: location}} replace/>;
    }

    // Check if user has required role
    if (allowedRoles && allowedRoles.length > 0) {
        const userRole = user?.role || 'reporter';
        if (!allowedRoles.includes(userRole)) {
            return <Navigate to="/" replace/>;
        }
    }

    return <Outlet/>;
}