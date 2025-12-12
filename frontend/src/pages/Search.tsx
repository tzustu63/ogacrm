import React, { useEffect } from 'react'
import { Typography, Box, Container } from '@mui/material'
import { useDispatch, useSelector } from 'react-redux'
import { clearResults, clearError } from '@/store/slices/searchSlice'
import { SearchInput, AdvancedFilters, SearchResults } from '@/components/search'
import { School } from '@/types'

const Search: React.FC = () => {
  const dispatch = useDispatch()
  const results = useSelector((state: any) => state.search?.results || [])
  const query = useSelector((state: any) => state.search?.query || '')

  useEffect(() => {
    // Clear any previous search results when component mounts
    dispatch(clearError())
    
    // Cleanup function to clear results when leaving the page
    return () => {
      dispatch(clearResults())
    }
  }, [dispatch])

  const handleSearch = (searchQuery: string) => {
    console.log('Search initiated:', searchQuery)
  }

  const handleSchoolSelect = (school: School) => {
    console.log('School selected:', school)
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          搜尋學校
        </Typography>
        <Typography variant="body1" color="text.secondary">
          使用關鍵字搜尋學校，或使用進階篩選功能找到符合條件的學校記錄
        </Typography>
      </Box>

      {/* Search Input */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
        <SearchInput onSearch={handleSearch} />
      </Box>

      {/* Advanced Filters */}
      <AdvancedFilters />

      {/* Search Results */}
      {(results.length > 0 || query) && (
        <SearchResults onSchoolSelect={handleSchoolSelect} />
      )}

      {/* Empty State */}
      {results.length === 0 && !query && (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            color: 'text.secondary',
          }}
        >
          <Typography variant="h6" gutterBottom>
            開始搜尋學校
          </Typography>
          <Typography variant="body2">
            在上方輸入關鍵字或使用篩選條件來搜尋學校記錄
          </Typography>
        </Box>
      )}
    </Container>
  )
}

export default Search