import AdminSessionProvider from "./admin-session"

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return <AdminSessionProvider>{children}</AdminSessionProvider>
}

export default AdminLayout
