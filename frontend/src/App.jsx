import { useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import TopNavBar from './components/layout/TopNavBar';
import SideNavBar from './components/layout/SideNavBar';
import Dashboard from './pages/Dashboard';
import ReportForm from './pages/ReportForm';
import MyTickets from './pages/MyTickets';
import Login from './pages/Login';
import Register from './pages/Register';
import CampusMap from './pages/CampusMap';
import AdminPanel from './pages/AdminPanel';

/**
 * Layout – Shell with TopNavBar + SideNavBar + content area
 * Content renders via <Outlet /> inside the sidebar-offset main area.
 */
function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-on-background antialiased">
      <TopNavBar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <div className="flex h-[calc(100vh-4rem)]">
        <SideNavBar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        {/* Main content – offset by sidebar width on desktop */}
        <div className="flex-1 md:ml-64 overflow-hidden">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Routes with sidebar layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/report" element={<ReportForm />} />
          <Route path="/my-tickets" element={<MyTickets />} />
          <Route path="/map" element={<CampusMap />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Route>

        {/* Auth routes – no sidebar */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}