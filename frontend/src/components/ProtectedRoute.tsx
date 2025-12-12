import React, { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { RootState, useAppDispatch } from '@/store'
import { getCurrentUser } from '@/store/slices/authSlice'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const dispatch = useAppDispatch()
  const { isAuthenticated, isLoading, token } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    // If we have a token but no user info, try to get current user
    if (token && !isAuthenticated && !isLoading) {
      dispatch(getCurrentUser())
    }
  }, [dispatch, token, isAuthenticated, isLoading])

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute