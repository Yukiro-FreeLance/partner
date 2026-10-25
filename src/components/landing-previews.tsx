import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export function PhoneFrame({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {
  return (
    <div className={cn("overflow-hidden rounded-[1.75rem] border-[6px] border-white bg-[#fffafc] shadow-[var(--shadow)]", className)}>
      <p className="sr-only">{label}</p>
      <div className="mx-auto mt-2 h-1.5 w-14 rounded-full bg-muted" aria-hidden />
      <div className="p-3">{children}</div>
    </div>
  );
}

export function CoupleScene() {
  return (
    <svg viewBox="0 0 640 420" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8d7e4" />
          <stop offset="45%" stopColor="#f3c7d8" />
          <stop offset="100%" stopColor="#e7d7fb" />
        </linearGradient>
      </defs>
      <rect width="640" height="420" fill="url(#sky)" />
      <circle cx="470" cy="78" r="42" fill="#fff4ea" opacity="0.85" />
      <path d="M0 300 C120 250 180 280 280 250 C390 216 470 250 640 210 L640 420 L0 420 Z" fill="#f4b7c8" opacity="0.55" />
      <path d="M0 340 C160 300 260 340 400 310 C500 290 560 320 640 300 L640 420 L0 420 Z" fill="#d989a4" opacity="0.35" />
      <g transform="translate(250 168)">
        <circle cx="78" cy="28" r="22" fill="#6b3a55" />
        <path d="M40 150 C40 92 58 70 78 70 C98 70 116 92 116 150 Z" fill="#7a4a4a" />
        <circle cx="132" cy="40" r="20" fill="#c48b78" />
        <path d="M104 154 C108 96 124 78 140 78 C162 78 176 104 170 154 Z" fill="#f3d2cf" />
      </g>
      <path d="M430 86c8-14 28-14 32 2 6-16 28-12 28 6 0 18-22 32-30 38-8-6-30-20-30-38 0-12 10-16 16-8z" fill="#fff" opacity="0.9" />
    </svg>
  );
}

function SampleDevice({ children, label, tone, className }: { children: React.ReactNode; label: string; tone: "light" | "black"; className?: string }) {
  const black = tone === "black";
  return (
    <div className={cn("flex w-[10rem] flex-col overflow-hidden rounded-[1.7rem] border-[5px] shadow-[0_22px_40px_-18px_rgba(0,0,0,0.45)] sm:w-[11rem]", black ? "border-black bg-black text-white" : "border-[#f4f0f8] bg-white text-[#2e2440]", className)}>
      <p className="sr-only">{label}</p>
      <div className={cn("mx-auto mt-1.5 h-1 w-9 rounded-full", black ? "bg-white/25" : "bg-black/10")} aria-hidden />
      <div className="p-2.5">{children}</div>
    </div>
  );
}

export function HeroPhones({ tone = "light" }: { tone?: "light" | "black" }) {
  const black = tone === "black";
  const colors = ["Blue", "Pink", "Purple", "Yellow", "Black"];
  return (
    <div className="flex items-end">
      <SampleDevice tone={tone} label="Sample home screen. Illustration only, not a customer result." className="z-10">
        <p className={cn("text-[9px]", black ? "text-white/55" : "text-[#8b849c]")}>Good morning</p>
        <p className="font-serif text-[13px] leading-tight">A sample couple</p>
        <div className={cn("mt-2 rounded-xl p-2", black ? "bg-white/10" : "bg-[#f4f0ff]")}>
          <p className={cn("text-[9px]", black ? "text-white/60" : "text-[#8b849c]")}>Knowledge score <span className={cn("rounded-full px-1.5", black ? "bg-emerald-400/20 text-emerald-300" : "bg-emerald-100 text-emerald-700")}>Example</span></p>
          <p className="font-serif text-xl leading-none">77.5%</p>
          <div className={cn("mt-1.5 h-1.5 rounded-full", black ? "bg-white/15" : "bg-white")} aria-hidden><div className="h-1.5 w-[77%] rounded-full bg-emerald-500" /></div>
        </div>
        <div className="mt-2 grid gap-1">
          {["Partner Quiz", "Personality Lab", "Our Connection"].map((item) => (
            <p key={item} className={cn("rounded-lg px-2 py-1 text-[10px]", black ? "bg-white/8 text-white/90" : "bg-[#faf7ff]")}>{item}</p>
          ))}
        </div>
      </SampleDevice>
      <SampleDevice tone={tone} label="Sample partner quiz screen." className="z-20 -ml-5 w-[10.4rem] sm:w-[11.4rem]">
        <p className={cn("text-[8px] font-semibold tracking-[0.14em] uppercase", black ? "text-[#e9d5ff]" : "text-primary")}>Partner Quiz</p>
        <p className="mt-1 font-serif text-[12px] leading-snug">What is your partner&apos;s favorite color?</p>
        <div className="mt-2 grid gap-1">
          {colors.map((color) => (
            <p key={color} className={cn("rounded-full px-2 py-1 text-[10px]", color === "Blue" ? (black ? "bg-primary text-white" : "border border-primary bg-[#f3e8ff]") : black ? "bg-white/8" : "border border-[#efe7f6] bg-white")}>{color}</p>
          ))}
        </div>
        <p className="mt-2 rounded-full bg-primary py-1.5 text-center text-[11px] font-medium text-white">Next</p>
      </SampleDevice>
    </div>
  );
}

export function HeroHomeScreen() {
  return (
    <div className="grid gap-2 text-[11px] leading-tight text-foreground">
      <p className="text-[10px] text-muted-foreground">Good morning</p>
      <p className="font-serif text-base">A sample couple</p>
      <div className="rounded-2xl bg-[#f4f0ff] p-2">
        <div className="flex items-center justify-between"><span className="text-muted-foreground">Knowledge score</span><span className="rounded-full bg-emerald-100 px-1.5 text-[10px] text-emerald-700">Example</span></div>
        <p className="font-serif text-2xl">77.5%</p>
        <div className="mt-1 h-1.5 rounded-full bg-white"><div className="h-1.5 w-[77%] rounded-full bg-emerald-500" /></div>
      </div>
      {["Partner Quiz", "Personality Lab", "Our Connection"].map((item) => <p key={item} className="rounded-xl bg-[#faf7ff] px-2 py-1.5">{item}</p>)}
      <p className="text-[10px] text-muted-foreground">Illustration only. Not a customer result.</p>
    </div>
  );
}

export function HeroQuizScreen() {
  const colors = ["Blue", "Pink", "Purple", "Yellow", "Black"];
  return (
    <div className="grid gap-1.5 text-[11px] text-foreground">
      <p className="text-[10px] tracking-wide text-rose uppercase">Partner Quiz</p>
      <p className="font-serif text-sm leading-snug">What is your partner&apos;s favorite color?</p>
      {colors.map((color) => (
        <div key={color} className={cn("rounded-full border px-2 py-1", color === "Blue" ? "border-primary bg-[#f3e8ff]" : "bg-white")}>{color}</div>
      ))}
      <p className="mt-1 rounded-full bg-primary py-1.5 text-center text-white">Next</p>
    </div>
  );
}

export function FoodQuizPreview() {
  const foods = ["Pizza", "Sushi", "Pasta", "Burger"];
  return (
    <div className="grid gap-1 text-[10px]">
      <p className="font-medium">What&apos;s your partner&apos;s favorite food?</p>
      <div className="grid grid-cols-2 gap-1">
        {foods.map((food) => <p key={food} className="rounded-xl bg-[#fff7fb] px-1 py-2 text-center">{food}</p>)}
      </div>
    </div>
  );
}

export function PersonalityPreview() {
  return (
    <div className="grid gap-1 text-[10px]">
      <p className="font-medium">Your Personality Style</p>
      {[["Social energy", "70%"], ["Planning", "60%"], ["Decision making", "75%"]].map(([label, value]) => (
        <div key={label}>
          <div className="flex justify-between"><span>{label}</span><span>{value}</span></div>
          <div className="mt-0.5 h-1 rounded-full bg-secondary"><div className="h-1 rounded-full bg-primary" style={{ width: value }} /></div>
        </div>
      ))}
      <p className="text-muted-foreground">Example bars, not a real result.</p>
    </div>
  );
}

export function ConnectionPreview() {
  return (
    <div className="grid gap-1 text-[10px]">
      <p className="font-medium">Shared interests</p>
      {["Travel", "Music", "Food"].map((item) => <p key={item} className="rounded-full bg-secondary px-2 py-1">{item}</p>)}
      <p className="text-muted-foreground">Sample comparison.</p>
    </div>
  );
}

export function StoryPreview() {
  return (
    <div className="grid gap-1 text-[10px]">
      <p className="font-medium">Our timeline</p>
      {[["First meeting", "A sample date"], ["A rainy walk", "A sample note"], ["A trip ahead", "A sample plan"]].map(([title, when]) => (
        <p key={title} className="rounded-xl bg-secondary px-2 py-1"><span className="block font-medium">{title}</span><span className="text-muted-foreground">{when}</span></p>
      ))}
    </div>
  );
}

export function SampleHomeScreen() {
  return (
    <div className="grid gap-2 text-[11px] leading-tight text-foreground">
      <p className="text-[10px] tracking-wide text-rose uppercase">Sample screen</p>
      <p className="font-medium">Good morning</p>
      <p className="font-serif text-base">A sample couple</p>
      <div className="rounded-2xl bg-secondary p-2">
        <p className="text-muted-foreground">Knowledge score</p>
        <p className="font-serif text-2xl">77.5%</p>
        <p className="text-emerald-700">Example band · Great Connection</p>
        <div className="mt-1 h-1.5 rounded-full bg-white"><div className="h-1.5 w-[77%] rounded-full bg-emerald-500" /></div>
      </div>
      <p className="text-[10px] text-muted-foreground">Illustration only. Not a customer result.</p>
    </div>
  );
}

export function SampleQuizScreen() {
  const colors = ["Blue", "Pink", "Purple", "Green", "Yellow"];
  return (
    <div className="grid gap-2 text-[11px] text-foreground">
      <p className="text-[10px] tracking-wide text-rose uppercase">Sample question</p>
      <p className="text-muted-foreground">3 / 10</p>
      <p className="font-serif text-sm leading-snug">What is your partner&apos;s favorite color?</p>
      <div className="grid gap-1">
        {colors.map((color) => (
          <div key={color} className={cn("rounded-full border px-2 py-1", color === "Blue" ? "border-primary bg-secondary" : "bg-white")}>{color}</div>
        ))}
      </div>
    </div>
  );
}

export function HeartDoodle({ className }: { className?: string }) {
  return <Heart className={cn("size-4 fill-rose/30 text-rose", className)} aria-hidden />;
}
