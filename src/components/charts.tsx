"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function TrendChart({ data }: { data: { label: string; score: number }[] }) {
  if (data.length < 2) return <p className="text-sm text-muted-foreground">Not enough answers yet for a trend. Finish another quiz to see the line.</p>;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Line type="monotone" dataKey="score" stroke="#6e3450" strokeWidth={2} name="Knowledge" />
        </LineChart>
      </ResponsiveContainer>
      <table className="sr-only"><caption>Knowledge scores</caption><tbody>{data.map((row) => <tr key={row.label}><th>{row.label}</th><td>{row.score}</td></tr>)}</tbody></table>
    </div>
  );
}

export function CompareChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Bar dataKey="value" fill="#c4848a" name="Score" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
