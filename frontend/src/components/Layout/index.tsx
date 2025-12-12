import React from 'react'
import { Outlet } from 'react-router-dom'
import { Box, Container } from '@mui/material'
import Sidebar from './Sidebar'
import Header from './Header'

const Layout: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Header />
        <Container
          component="main"
          maxWidth={false}
          sx={{
            flexGrow: 1,
            py: 3,
            px: 3,
            backgroundColor: 'background.default',
          }}
        >
          <Outlet />
        </Container>
      </Box>
    </Box>
  )
}

export default Layout