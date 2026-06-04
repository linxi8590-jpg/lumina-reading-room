import { Routes, Route, Navigate } from 'react-router-dom'
import Onboarding from './pages/Onboarding'
import Shelf from './pages/Shelf'
import Reader from './pages/Reader'
import ConnectorConfig from './pages/ConnectorConfig'
import Settings from './pages/Settings'
import Upload from './pages/Upload'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/shelf" replace />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/shelf" element={<Shelf />} />
      <Route path="/upload" element={<Upload />} />
      <Route path="/reader/:bookId?" element={<Reader />} />
      <Route path="/connector" element={<ConnectorConfig />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  )
}
