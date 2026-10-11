export const StatCard = ({
  label,
  value,
  detail
}: {
  label: string
  value: string
  detail?: string
}) => (
  <div className="min-w-0 rounded-lg border border-white/10 bg-white/4.5 px-3 py-3.5 shadow-2xl shadow-sky-950/10 sm:px-4">
    <p className="text-xs font-medium leading-4 text-white/52">{label}</p>
    <p className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">{value}</p>
    {detail ? <p className="mt-1 text-xs font-medium leading-4 text-white/42">{detail}</p> : null}
  </div>
)
