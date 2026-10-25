import { diffDays } from "@/lib/cycle/dates";
import type { CycleEstimate } from "@/lib/cycle/predict";

const colors = {
  menstrual: "#be123c",
  follicular: "#f9a8d4",
  ovulation: "#7c3aed",
  luteal: "#ddd6fe",
};

export function CycleRing({ estimate }: { estimate: CycleEstimate }) {
  const length = Math.max(estimate.cycleLength ?? 28, estimate.cycleDay ?? 1, 1);
  const period = Math.min((estimate.periodLength ?? 5) / length, 1);
  const ovulationDay = estimate.lastPeriodStart && estimate.ovulationDate ? diffDays(estimate.ovulationDate, estimate.lastPeriodStart) + 1 : null;
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const title = estimate.cycleDay ? `Cycle day ${estimate.cycleDay} of about ${estimate.cycleLength ?? length}. Predicted phase: ${estimate.phase}.` : "No recorded period yet.";
  const marker = estimate.cycleDay ? ((estimate.cycleDay - 0.5) / length) * Math.PI * 2 - Math.PI / 2 : null;
  return (
    <figure className="grid justify-items-center gap-3">
      <svg viewBox="0 0 200 200" className="size-56" role="img" aria-labelledby="cycle-ring-title">
        <title id="cycle-ring-title">{title}</title>
        <g transform="rotate(-90 100 100)">
          <circle cx="100" cy="100" r={radius} fill="none" stroke="#f3e8ff" strokeWidth="16" />
          {estimate.hasHistory && ovulationDay && (
            <>
              <Arc radius={radius} circumference={circumference} start={0} end={period} color={colors.menstrual} />
              <Arc radius={radius} circumference={circumference} start={period} end={Math.max(period, (ovulationDay - 1) / length)} color={colors.follicular} />
              <Arc radius={radius} circumference={circumference} start={Math.max(0, (ovulationDay - 1) / length)} end={Math.min(1, ovulationDay / length)} color={colors.ovulation} />
              <Arc radius={radius} circumference={circumference} start={Math.min(1, ovulationDay / length)} end={1} color={colors.luteal} />
            </>
          )}
        </g>
        {marker !== null && <circle cx={100 + radius * Math.cos(marker)} cy={100 + radius * Math.sin(marker)} r="7" fill="#4c1d95" stroke="white" strokeWidth="3" />}
        <text x="100" y="96" textAnchor="middle" className="fill-[#4c1d95]" fontSize="28" fontWeight="700">{estimate.cycleDay ?? "—"}</text>
        <text x="100" y="118" textAnchor="middle" className="fill-[#6b6280]" fontSize="12">cycle day</text>
      </svg>
      <figcaption className="sr-only">{title}</figcaption>
      <ul className="flex flex-wrap justify-center gap-2 text-xs">
        {(["menstrual", "follicular", "ovulation", "luteal"] as const).map((phase) => (
          <li key={phase} className="inline-flex items-center gap-1 capitalize"><span className="size-2.5 rounded-full" style={{ background: colors[phase] }} />{phase}</li>
        ))}
      </ul>
    </figure>
  );
}

function Arc({ radius, circumference, start, end, color }: { radius: number; circumference: number; start: number; end: number; color: string }) {
  const span = Math.max(end - start, 0);
  if (span <= 0) return null;
  return <circle cx="100" cy="100" r={radius} fill="none" stroke={color} strokeWidth="16" strokeDasharray={`${span * circumference} ${circumference}`} strokeDashoffset={-start * circumference} />;
}
