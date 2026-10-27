"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/plans/labels";

export function BudgetCharts({ currency, days, categories, payers }: { currency: string; days: { label: string; estimated: number; actual: number }[]; categories: { name: string; estimated: number; actual: number }[]; payers: { name: string; paid: number }[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Estimated versus actual by day" caption="Estimated and actual spending for each day">
        {days.length ? <Bars currency={currency} data={days} series={[{ key: "estimated", name: "Estimated", fill: "#c4848a" }, { key: "actual", name: "Actual", fill: "#6e3450" }]} /> : <Empty />}
      </ChartCard>
      <ChartCard title="Spending by category" caption="Estimated and actual spending by category">
        {categories.length ? <Bars currency={currency} data={categories} series={[{ key: "estimated", name: "Estimated", fill: "#c4848a" }, { key: "actual", name: "Actual", fill: "#6e3450" }]} /> : <Empty />}
      </ChartCard>
      <ChartCard title="Individual versus shared payments" caption="Amount recorded as paid by each partner and as shared">
        {payers.length ? <Bars currency={currency} data={payers} series={[{ key: "paid", name: "Paid", fill: "#6e3450" }]} /> : <Empty />}
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) {
  return (
    <section className="panel p-4">
      <h2 className="font-serif text-2xl">{title}</h2>
      <div className="mt-4">{children}</div>
      <p className="sr-only">{caption}</p>
    </section>
  );
}

function Bars({ currency, data, series }: { currency: string; data: Record<string, string | number>[]; series: { key: string; name: string; fill: string }[] }) {
  const labelKey = "label" in data[0] || "name" in data[0] ? ("label" in data[0] ? "label" : "name") : "name";
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={labelKey} interval={0} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value) => formatMoney(Number(value ?? 0), currency)} />
          <Legend />
          {series.map((item) => <Bar key={item.key} dataKey={item.key} name={item.name} fill={item.fill} radius={[6, 6, 0, 0]} />)}
        </BarChart>
      </ResponsiveContainer>
      <table className="sr-only">
        <caption>Chart values</caption>
        <thead><tr><th>Item</th>{series.map((item) => <th key={item.key}>{item.name}</th>)}</tr></thead>
        <tbody>
          {data.map((row) => (
            <tr key={String(row[labelKey])}>
              <th>{String(row[labelKey])}</th>
              {series.map((item) => <td key={item.key}>{formatMoney(Number(row[item.key] ?? 0), currency)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-muted-foreground">Add an expense to see this chart.</p>;
}
