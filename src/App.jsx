import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import SurveyPage from './pages/SurveyPage.jsx'
import PublicDashboardPage from './pages/PublicDashboardPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import AdminLoginPage from './pages/AdminLoginPage.jsx'
import Layout from './components/Layout.jsx'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<SurveyPage />} />
        <Route path="/public" element={<PublicDashboardPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
