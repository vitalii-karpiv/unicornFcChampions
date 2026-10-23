export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="bg-background p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="tabular mt-1 font-mono text-xl font-semibold">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
