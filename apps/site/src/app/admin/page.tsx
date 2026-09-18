"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useAdminRole } from "./admin-session"
import { PAGES, MANUAL_RESULTS_SLUG } from "./pages-config"

const AdminIndexPage = () => {
  const role = useAdminRole()
  const router = useRouter()

  useEffect(() => {
    const targetSlug = role === "captain" ? MANUAL_RESULTS_SLUG : PAGES[0].slug
    router.replace(`/admin/${targetSlug}`)
  }, [role, router])

  return null
}

export default AdminIndexPage
