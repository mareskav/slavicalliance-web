import { AlertTriangle } from "lucide-react"

export const TestDataWarning = () => (
  <section
    role="status"
    className="flex flex-col gap-3 rounded-lg border border-amber-200/24 bg-amber-300/10 px-4 py-4 text-amber-50 shadow-2xl shadow-amber-950/10 sm:flex-row sm:items-start sm:px-5"
  >
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-100/20 bg-amber-100/10 text-amber-100">
      <AlertTriangle className="h-5 w-5" />
    </div>
    <div>
      <p className="text-base font-bold leading-6 text-white">Data jsou v testovacím režimu</p>
      <p className="mt-1 max-w-4xl text-sm font-medium leading-6 text-amber-50/78">
        Výsledky zatím berte jen jako orientační. Data mohou být neúplná a chybná.
      </p>
    </div>
  </section>
)
