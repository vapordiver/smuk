import {useState, useEffect, useCallback} from 'react';
import {BrowserRouter, Routes, Route, Outlet, useLocation} from 'react-router-dom';
import {AuthProvider} from "./context/AuthContext";
import {NotificationProvider} from './context/NotificationContext';
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
import CoordinatorPanel from './pages/CoordinatorPanel';
import ProtectedRoute from "./components/common/ProtectedRoute";
import Toast, {useToast} from "./components/common/Toast.jsx";
import {getPendingTickets, deletePendingTicket} from "./services/db.js";
import api from "./services/api"

/**
 * Layout – Shell with TopNavBar + SideNavBar + content area
 * Content renders via <Outlet /> inside the sidebar-offset main area.
 */
function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const {toast, showToast} = useToast();

    // Auto-close sidebar on route change
    useEffect(() => {
        setSidebarOpen(false);
    }, [location]);

    //fallback : manual synchronization for iOS safari after user is back online
    const syncPending = useCallback(async () => {
        try {
            const tickets = await getPendingTickets();
            if (!tickets || tickets.length === 0) {
                return;
            }
            let successCount = 0;
            for (const ticket of tickets) {
                const formData = new FormData();
                formData.append('title', ticket.title);
                formData.append('category_id', ticket.categoryId);
                if (ticket.building_id) {
                    formData.append('building_id', ticket.buildingId);
                }
                formData.append('description', ticket.description);
                formData.append('latitude', ticket.latitude);
                formData.append('longitude', ticket.longitude);
                formData.append('image', ticket.image);
                try {
                    //force authorization with saved token
                    const res = await api.post('/tickets/', formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                            'Authorization': `Bearer ${ticket.token}`
                        }
                    });
                    await deletePendingTicket(ticket.id);
                    successCount++;
                } catch (err) {
                    //delete only if success, validation error or error in function logic / web error doesnt delete from 'queue'
                    if (err.response && err.response.status >= 400 && err.response.status < 500 && err.response.status !== 401 && err.response.status !== 429) {
                        await deletePendingTicket(ticket.id);
                    }
                }
            }
            if (successCount > 0) {
                showToast('success', `Wysłano ${successCount} zgłoszeń zapisanych offline.`);
            }
        } catch (error) {
            console.error("Error during manual synchronization", error);
        }
    }, [showToast]);

    //events for iOS ssafari (on open/refresh app)
    useEffect(() => {
        window.addEventListener('online', syncPending);
        //exec immediately
        if (navigator.onLine) {
            syncPending();
        }
        //listen for success on background sync from serviceworker (android chrome)
        const handleSWMessage = (event) => {
            if (event.data && event.data.type === 'SYNC_SUCCESS') {
                showToast('success', `Wysłano ${event.data.count} zgłoszeń zapisanych offline.`);
            }
        };
        navigator.serviceWorker?.addEventListener('message', handleSWMessage);

        return () => {
            window.removeEventListener('online', syncPending);
            navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
        }
    }, [syncPending, showToast]);

    return (
        <div className="min-h-screen bg-background text-on-background antialiased">
            <Toast {...toast}/>
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
            <NotificationProvider>
                <BrowserRouter>
                    <Routes>
                        {/* Routes with sidebar layout */}
                        <Route element={<Layout/>}>
                            <Route path="/" element={<Dashboard/>}/>
                            <Route path="/map" element={<CampusMap/>}/>
                            <Route element={<ProtectedRoute/>}>
                                <Route path="/report" element={<ReportForm/>}/>
                                <Route path="/my-tickets" element={<MyTickets/>}/>
                                <Route path="/profile" element={<ProfilePage/>}/>
                            </Route>
                            <Route element={<ProtectedRoute allowedRoles={['coordinator']}/>}>
                                <Route path="/admin" element={<CoordinatorPanel/>}/>
                            </Route>
                        </Route>
                        {/* Auth routes – no sidebar */}
                        <Route path="/login" element={<Login/>}/>
                        <Route path="/register" element={<Register/>}/>
                    </Routes>
                </BrowserRouter>
            </NotificationProvider>
        </AuthProvider>
    );
}
