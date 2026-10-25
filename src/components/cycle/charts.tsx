"use client";

import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LEVEL_WORDS } from "@/lib/cycle/copy";

const tick = { fill: "#6b6280", fontSize: 12 };
const grid = "#efe7f6";

export function CycleCharts({ lengths, symptoms, drive }: { lengths: { label: string; days: number }[]; symptoms: { name: string; count: number }[]; drive: { label: string; value: number }[] }) {
  return (
    <div className="grid gap-4">
      <section className="panel p-5">
        <h2 className="font-serif text-2xl">Recorded cycle lengths</h2>
        <p className="mt-1 text-sm text-muted-foreground">{lengths.length < 2 ? "Log at least two period starts to see cycle length." : `${lengths.length} completed cycles from recorded period starts.`}</p>
        {lengths.length >= 2 && (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lengths} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={tick} axisLine={false} tickLine={false} width={32} />
                <Tooltip content={<ChartTip unit="days" />} cursor={{ fill: "#f5f3ff" }} />
                <Bar dataKey="days" fill="#a78bfa" name="Cycle length" radius={[12, 12, 0, 0]} maxBarSize={72}>
                  <LabelList dataKey="days" position="top" fill="#4c1d95" fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <table className="sr-only"><caption>Cycle lengths</caption><tbody>{lengths.map((row) => <tr key={row.label}><th>{row.label}</th><td>{row.days} days</td></tr>)}</tbody></table>
          </div>
        )}
      </section>
      <section className="panel p-5">
        <h2 className="font-serif text-2xl">Symptom frequency</h2>
        <p className="mt-1 text-sm text-muted-foreground">{symptoms.length === 0 ? "Symptom names will appear after a check-in." : symptoms.map((row) => `${row.name} on ${row.count} check-in${row.count === 1 ? "" : "s"}`).join(" · ")}</p>
        {symptoms.length > 0 && (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={symptoms} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false} interval={0} />
                <YAxis allowDecimals={false} tick={tick} axisLine={false} tickLine={false} width={32} />
                <Tooltip content={<ChartTip unit="check-ins" />} cursor={{ fill: "#fff1f2" }} />
                <Bar dataKey="count" fill="#f9a8d4" name="Check-ins" radius={[12, 12, 0, 0]} maxBarSize={72}>
                  <LabelList dataKey="count" position="top" fill="#9f1239" fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <table className="sr-only"><caption>Symptom frequency</caption><tbody>{symptoms.map((row) => <tr key={row.name}><th>{row.name}</th><td>{row.count}</td></tr>)}</tbody></table>
          </div>
        )}
      </section>
      <section className="panel p-5">
        <h2 className="font-serif text-2xl">Logged sex drive</h2>
        <p className="mt-1 text-sm text-muted-foreground">This is your own log. A phase label is context, not an explanation of desire.</p>
        {drive.length < 2 ? <p className="mt-3 text-sm text-muted-foreground">Sex drive appears after two check-ins that include it.</p> : (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={drive} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} tickMargin={12} padding={{ left: 28, right: 16 }} />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tickFormatter={(value) => LEVEL_WORDS[Number(value) - 1] ?? ""} tick={tick} axisLine={false} tickLine={false} width={88} />
                <Tooltip content={<DriveTip />} />
                <Line type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={3} name="Sex drive" dot={{ r: 5, fill: "#ffffff", stroke: "#7c3aed", strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
            <table className="sr-only"><caption>Logged sex drive</caption><tbody>{drive.map((row) => <tr key={row.label}><th>{row.label}</th><td>{LEVEL_WORDS[row.value - 1]}</td></tr>)}</tbody></table>
          </div>
        )}
      </section>
    </div>
  );
}

function ChartTip({ active, payload, label, unit }: { active?: boolean; payload?: { value?: number }[]; label?: string; unit: string }) {
  if (!active || !payload?.[0]) return null;
  return (
    <div className="rounded-2xl bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">{payload[0].value} {unit}</p>
    </div>
  );
}

function DriveTip({ active, payload, label }: { active?: boolean; payload?: { value?: number }[]; label?: string }) {
  if (!active || !payload?.[0]?.value) return null;
  return (
    <div className="rounded-2xl bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">{LEVEL_WORDS[payload[0].value - 1] ?? payload[0].value}</p>
    </div>
  );
}
