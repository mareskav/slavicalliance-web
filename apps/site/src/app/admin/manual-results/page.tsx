import ManualResultsPanel from "../ManualResultsPanel"

const ManualResultsPage = () => {
  return (
    <>
      <div className="mt-4">
        <h1 className="text-xl font-semibold">Historické výsledky</h1>
        <p className="mt-1 text-sm text-white/58">Ruční zadání výsledků kvízu</p>
      </div>
      <ManualResultsPanel />
    </>
  )
}

export default ManualResultsPage
