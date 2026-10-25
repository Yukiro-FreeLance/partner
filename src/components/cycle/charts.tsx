"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function CycleCharts({ lengths, symptoms, drive }: { lengths: { label: string; days: number }[]; symptoms: { name: string; count: number }[]; drive: { label: string; value: number }[] }) {
  return (
    <div className="grid gap-4">
      <section className="panel p-4">
        <h2 className="font-serif text-2xl">Recorded cycle lengths</h2>
        {lengths.length < 2 ? <p className="mt-3 text-sm text-muted-foreground">Log at least two period starts to see cycle length.</p> : (
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lengths}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="days" fill="#7c3aed" name="Days" /></BarChart>
            </ResponsiveContainer>
            <table className="sr-only"><caption>Cycle lengths</caption><tbody>{lengths.map((row) => <tr key={row.label}><th>{row.label}</th><td>{row.days} days</td></tr>)}</tbody></table>
          </div>
        )}
      </section>
      <section className="panel p-4">
        <h2 className="font-serif text-2xl">Symptom frequency</h2>
        {symptoms.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Symptom names will appear after a check-in.</p> : (
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={symptoms}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#be123c" name="Check-ins" /></BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
      <section className="panel p-4">
        <h2 className="font-serif text-2xl">Logged sex drive</h2>
        <p className="mt-1 text-xs text-muted-foreground">This is your own log. A phase label is context, not an explanation of desire.</p>
        {drive.length < 2 ? <p className="mt-3 text-sm text-muted-foreground">Sex drive appears after two check-ins that include it.</p> : (
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={drive}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis domain={[1, 5]} allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="value" stroke="#6d28d9" strokeWidth={2} name="Sex drive" dot={false} /></LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
