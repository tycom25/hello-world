import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AIQuery from './pages/AIQuery'
import Interactions from './pages/Interactions'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="query" element={<AIQuery />} />
        <Route path="interactions" element={<Interactions />} />
      </Route>
    </Routes>
  )
}
