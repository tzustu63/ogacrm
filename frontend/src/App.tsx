import React from 'react'
import { Routes, Route } from 'react-router-dom'

import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Schools from './pages/Schools'
import SchoolDetail from './pages/SchoolDetail'
import Contacts from './pages/Contacts'
import Interactions from './pages/Interactions'
import Partnerships from './pages/Partnerships'
import Search from './pages/Search'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="schools" element={<Schools />} />
        <Route path="schools/:id" element={<SchoolDetail />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="interactions" element={<Interactions />} />
        <Route path="partnerships" element={<Partnerships />} />
        <Route path="search" element={<Search />} />
      </Route>
    </Routes>
  )
}

export default App