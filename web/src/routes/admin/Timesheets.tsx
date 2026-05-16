import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../components/Button";
import { Input, Select } from "../../components/Input";
import { listCaregivers } from "../../api/caregivers";
import { getTimesheets, timesheetExportUrl } from "../../api/timesheets";
import { addDays, formatDateShort, formatTime, toLocalDatetimeInput } from "../../lib/dates";

export default function AdminTimesheets() {
  const today = new Date();
  const [caregiverId, setCaregiverId] = useState("");
  const [from, setFrom] = useState(() => toLocalDatetimeInput(addDays(today, -14)).slice(0, 10));
  const [to, setTo] = useState(() => toLocalDatetimeInput(today).slice(0, 10));

  const { data: caregivers = [] } = useQuery({
    queryKey: ["caregivers"],
    queryFn: listCaregivers,
  });

  const filters = useMemo(
    () => ({
      caregiverId: caregiverId || undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
    }),
    [caregiverId, from, to],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["timesheets", filters],
    queryFn: () => getTimesheets(filters),
  });

  const exportUrl = timesheetExportUrl(filters);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Timesheets</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Completed shifts only, for billing &amp; payroll. Scheduled and in-progress shifts appear on{" "}
          <a href="/admin/calendar" className="text-brand-600 underline">Calendar</a>.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Select
          label="Caregiver"
          value={caregiverId}
          onChange={(e) => setCaregiverId(e.target.value)}
        >
          <option value="">All caregivers</option>
          {caregivers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <div className="flex items-end">
          <a href={exportUrl} className="w-full">
            <Button variant="secondary" className="w-full" type="button">
              Export CSV
            </Button>
          </a>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-2 flex justify-between text-sm bg-slate-50 border-b border-slate-200">
          <span className="text-slate-600">
            {isLoading ? "Loading…" : `${data?.rows.length ?? 0} shift${data?.rows.length === 1 ? "" : "s"}`}
          </span>
          <span className="font-medium">
            Total: {(data?.totalHours ?? 0).toFixed(2)}h
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Caregiver</th>
                <th className="text-left px-3 py-2">Client</th>
                <th className="text-left px-3 py-2">In</th>
                <th className="text-left px-3 py-2">Out</th>
                <th className="text-right px-3 py-2">Hours</th>
                <th className="text-center px-3 py-2">Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.rows.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-400">
                    <p className="italic">No completed shifts in this range.</p>
                    <p className="text-xs mt-1">
                      Future or in-progress shifts won't appear here — check{" "}
                      <a href="/admin/calendar" className="text-brand-600 underline">Calendar</a>.
                    </p>
                  </td>
                </tr>
              )}
              {data?.rows.map((r) => (
                <tr key={r.shiftId} className="hover:bg-slate-50">
                  <td className="px-3 py-2">{formatDateShort(r.scheduledStart)}</td>
                  <td className="px-3 py-2">{r.caregiverName}</td>
                  <td className="px-3 py-2">{r.clientName}</td>
                  <td className="px-3 py-2">{r.clockInAt ? formatTime(r.clockInAt) : "—"}</td>
                  <td className="px-3 py-2">{r.clockOutAt ? formatTime(r.clockOutAt) : "—"}</td>
                  <td className="px-3 py-2 text-right font-medium">
                    {r.hoursWorked.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.geofenceFlag ? <span className="text-red-600 font-medium">⚑</span> : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
