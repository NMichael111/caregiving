import { Routes, Route } from "react-router-dom";
import Login from "./routes/Login";
import RoleRouter from "./routes/RoleRouter";
import { AdminLayout } from "./components/AdminLayout";
import { CaregiverLayout } from "./components/CaregiverLayout";
import AdminToday from "./routes/admin/Today";
import AdminCalendar from "./routes/admin/Calendar";
import AdminClients from "./routes/admin/Clients";
import AdminClientDetail from "./routes/admin/ClientDetail";
import AdminCaregivers from "./routes/admin/Caregivers";
import AdminCaregiverDetail from "./routes/admin/CaregiverDetail";
import AdminShiftDetail from "./routes/admin/ShiftDetail";
import CaregiverToday from "./routes/caregiver/Today";
import CaregiverUpcoming from "./routes/caregiver/Upcoming";
import CaregiverHistory from "./routes/caregiver/History";
import CaregiverShiftDetail from "./routes/caregiver/ShiftDetail";
import Messages from "./routes/Messages";
import AdminTimesheets from "./routes/admin/Timesheets";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RoleRouter />} />

      <Route element={<AdminLayout />}>
        <Route path="/admin/today" element={<AdminToday />} />
        <Route path="/admin/calendar" element={<AdminCalendar />} />
        <Route path="/admin/caregivers" element={<AdminCaregivers />} />
        <Route path="/admin/caregivers/:id" element={<AdminCaregiverDetail />} />
        <Route path="/admin/clients" element={<AdminClients />} />
        <Route path="/admin/clients/:id" element={<AdminClientDetail />} />
        <Route path="/admin/shifts/:id" element={<AdminShiftDetail />} />
        <Route path="/admin/timesheets" element={<AdminTimesheets />} />
        <Route path="/admin/messages" element={<Messages />} />
      </Route>

      <Route element={<CaregiverLayout />}>
        <Route path="/caregiver/today" element={<CaregiverToday />} />
        <Route path="/caregiver/upcoming" element={<CaregiverUpcoming />} />
        <Route path="/caregiver/history" element={<CaregiverHistory />} />
        <Route path="/caregiver/messages" element={<Messages />} />
        <Route path="/caregiver/shifts/:id" element={<CaregiverShiftDetail />} />
      </Route>

      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center text-slate-500">
            Not found
          </div>
        }
      />
    </Routes>
  );
}

function Placeholder({ name }: { name: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">{name}</h1>
      <p className="text-slate-500">Coming in a later milestone.</p>
    </div>
  );
}
