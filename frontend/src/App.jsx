import {useState, useEffect} from 'react';
import {BrowserRouter, Routes, Route, Outlet, useLocation} from 'react-router-dom';
import {AuthProvider} from "./context/AuthContext";
import TopNavBar from './components/layout/TopNavBar';
import SideNavBar from './components/layout/SideNavBar';
import Dashboard from './pages/Dashboard';
import ReportForm from './pages/ReportForm';
import MyTickets from './pages/MyTickets';
import Login from './pages/Login';
import Register from './pages/Register';
import CampusMap from './pages/CampusMap';
import AdminPanel from './pages/AdminPanel';
import ProfilePage from './pages/ProfilePage';
import ProtectedRoute from "./components/common/ProtectedRoute";

/**
 * Layout – Shell with TopNavBar + SideNavBar + content area
 * Content renders via <Outlet /> inside the sidebar-offset main area.
 */
function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    // Auto-close sidebar on route change
    useEffect(() => {
        setSidebarOpen(false);
    }, [location]);

    return (
        <div className="min-h-screen bg-background text-on-background antialiased">
            <TopNavBar onToggleSidebar={() => setSidebarOpen((prev) => !prev)}/>
            <div className="flex h-[calc(100vh-4rem)]">
                <SideNavBar
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />
                {/* Main content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Outlet/>
                </div>
            </div>
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Routes with sidebar layout */}
                    <Route element={<Layout/>}>
                        <Route path="/" element={<Dashboard/>}/>
                        <Route path="/map" element={<CampusMap/>}/>
                        <Route element={<ProtectedRoute/>}>
                            <Route path="/report" element={<ReportForm/>}/>
                            <Route path="/my-tickets" element={<MyTickets/>}/>
                            <Route path="/admin" element={<AdminPanel/>}/>
                            <Route path="/profile" element={<ProfilePage/>}/>
                        </Route>
                    </Route>
                    {/* Auth routes – no sidebar */}
                    <Route path="/login" element={<Login/>}/>
                    <Route path="/register" element={<Register/>}/>
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}