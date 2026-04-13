import {Navigate, Outlet, useLocation} from 'react-router-dom';
import {useAuth} from "../../context/AuthContext";

export default function ProtectedRoute() {
    const {isAuthenticated, isLoading} = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined animate-spin text-4x1">progress_activity</span>
            </div>
        );
    }

    //if user isn't logged in redirect to /login AND save where he wanted to go (state from location)
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{from: location}} replace/>;
    }

    return <Outlet/>;
}