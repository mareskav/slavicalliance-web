import Link from "next/link"

import { pageSizeOptions } from "../_lib/constants"
import { PageSizeSelect } from "./PageSizeSelect"

export const TableFooter = ({
  rangeStart,
  rangeEnd,
  total,
  pageSize,
  currentPage,
  totalPages,
  visiblePages,
  getPageHref
}: {
  rangeStart: number
  rangeEnd: number
  total: number
  pageSize: number
  currentPage: number
  totalPages: number
  visiblePages: number[]
  getPageHref: (page: number) => string
}) => (
  <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5">
    <p className="text-sm text-white/52">
      {rangeStart}-{rangeEnd} z {total}
    </p>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <PageSizeSelect pageSize={pageSize} options={pageSizeOptions} />
      <nav className="flex items-center gap-1" aria-label="Stránkování výsledků">
        <Link
          href={getPageHref(Math.max(1, currentPage - 1))}
          aria-disabled={currentPage === 1}
          className={`inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium transition ${
            currentPage === 1
              ? "pointer-events-none text-white/28"
              : "text-white/68 hover:bg-white/7 hover:text-white"
          }`}
        >
          Předchozí
        </Link>
        {visiblePages.map((page) => (
          <Link
            key={page}
            href={getPageHref(page)}
            aria-current={page === currentPage ? "page" : undefined}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition ${
              page === currentPage
                ? "bg-sky-100/14 text-white ring-1 ring-sky-100/20"
                : "text-white/58 hover:bg-white/7 hover:text-white"
            }`}
          >
            {page}
          </Link>
        ))}
        <Link
          href={getPageHref(Math.min(totalPages, currentPage + 1))}
          aria-disabled={currentPage === totalPages}
          className={`inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium transition ${
            currentPage === totalPages
              ? "pointer-events-none text-white/28"
              : "text-white/68 hover:bg-white/7 hover:text-white"
          }`}
        >
          Další
        </Link>
      </nav>
    </div>
  </div>
)
