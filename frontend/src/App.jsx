import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ReportForm from './pages/ReportForm';
import MyTickets from './pages/MyTickets';
import Login from './pages/Login';
import Register from './pages/Register';
import CampusMap from './pages/CampusMap';
import AdminPanel from './pages/AdminPanel';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/report" element={<ReportForm />} />
          <Route path="/my-tickets" element={<MyTickets />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/map" element={<CampusMap />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}