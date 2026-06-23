import {useState, useEffect, useCallback, useRef} from 'react';
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
import {getPendingTickets, claimPendingTicket, savePendingTicket} from "./services/db.js";
import api from "./services/api"

/**
 * Layout – Shell with TopNavBar + SideNavBar + content area
 * Content renders via <Outlet /> inside the sidebar-offset main area.
 */
function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const {toast, showToast} = useToast();

    //blocks multiple sync tries at same time
    const isSyncingRef = useRef(false);
    //blocks synchro start after every sitee switch
    const isInitialMount = useRef(true);

    // Auto-close sidebar on route change
    useEffect(() => {
        setSidebarOpen(false);
    }, [location]);

//fallback : manual synchronization for iOS safari after user is back online
    const syncPending = useCallback(async () => {
        if (isSyncingRef.current) {
            return;
        }
        isSyncingRef.current = true;
        try {
            const tickets = await getPendingTickets();
            if (!tickets || tickets.length === 0) {
                isSyncingRef.current = false;
                return;
            }
            let successCount = 0;
            for (const ticket of tickets) {
                //claim ticket atomically (prevents race with SW background sync)
                const claimed = await claimPendingTicket(ticket.id);
                if (!claimed) continue;

                try {
                    const formData = new FormData();
                    formData.append('title', ticket.title);
                    formData.append('category_id', ticket.categoryId);
                    if (ticket.buildingId) {
                        formData.append('building_id', ticket.buildingId);
                    }
                    formData.append('description', ticket.description);
                    formData.append('latitude', ticket.latitude);
                    formData.append('longitude', ticket.longitude);
                    //conversion to base64 (issues with ios image sending)
                    let imageBlob = ticket.image;
                    if (typeof ticket.image === 'string' && ticket.image.startsWith('data:image')) {
                        const fetchRes = await fetch(ticket.image);
                        imageBlob = await fetchRes.blob();
                    }
                    formData.append('image', imageBlob, 'offline-image.jpg');
                    //401 issue fix, try get newest token instead of old one
                    const activeToken = localStorage.getItem('accessToken') || ticket.token;
                    //fetch instead of api.post, resolves issues with wrong data format
                    const res = await fetch('/api/tickets/', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${activeToken}`,
                            'ngrok-skip-browser-warning': 'true'
                        },
                        body: formData
                    });

                    //fetch error handling
                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        const errorMsg = errData?.error?.message || errData?.detail || `Kod błędu: ${res.status}`;
                        const error = new Error(errorMsg);
                        //attach http status code to error object
                        error.status = res.status;
                        throw error;
                    }
                    //ticket already deleted by claim, just count
                    successCount++;
                } catch (err) {
                    console.error("Błąd wysyłki offline:", err);
                    showToast('error', `Błąd wysyłki: ${err.message}`);
                    //re-queue for retry unless validation error (400)
                    if (err.status !== 400 && !err.message.toLowerCase().includes("validation")) {
                        await savePendingTicket(ticket);
                    }
                }
            }
            if (successCount > 0) {
                showToast('success', `Wysłano ${successCount} zgłoszeń zapisanych offline.`);
            }
        } catch (error) {
            console.error("Synchronization error:", error);
        } finally {
            isSyncingRef.current = false;
        }
    }, [showToast]);

    //events for iOS ssafari (on open/refresh app)
    useEffect(() => {
        const supportsBackgroundSync = 'serviceWorker' in navigator && 'SyncManager' in window;

        let handleSWMessage;
        if (supportsBackgroundSync) {
            handleSWMessage = (event) => {
                if (event.data && event.data.type === 'SYNC_SUCCESS') {
                    showToast('success', `Wysłano ${event.data.count} zgłoszeń zapisanych offline.`);
                }
            };
            navigator.serviceWorker?.addEventListener('message', handleSWMessage);
        }

        //sync pending tickets on app open and when connection is restored
        //race condition with SW prevented by atomic claimPendingTicket in both paths
        window.addEventListener('online', syncPending);
        if (navigator.onLine && isInitialMount.current) {
            isInitialMount.current = false;
            syncPending();
        }
        return () => {
            if (supportsBackgroundSync && handleSWMessage) {
                navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
            }
            window.removeEventListener('online', syncPending);
        };
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
