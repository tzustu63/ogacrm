import React, { useState, useCallback } from 'react'
import {
  TextField,
  InputAdornment,
  IconButton,
  Box,
  Autocomplete,
  CircularProgress,
} from '@mui/material'
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material'
import { useDispatch, useSelector } from 'react-redux'
import { setQuery, searchSchools } from '@/store/slices/searchSlice'
import { searchApi } from '@/services/api'
import { debounce } from 'lodash'

interface SearchInputProps {
  placeholder?: string
  onSearch?: (query: string) => void
}

const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = '搜尋學校名稱、聯絡人或備註...',
  onSearch,
}) => {
  const dispatch = useDispatch()
  const query = useSelector((state: any) => state.search?.query || '')
  const filters = useSelector((state: any) => state.search?.filters || {})
  const isLoading = useSelector((state: any) => state.search?.isLoading || false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  const debouncedGetSuggestions = useCallback(
    debounce(async (inputValue: string) => {
      if (inputValue.length > 1) {
        setLoadingSuggestions(true)
        try {
          const suggestions = await searchApi.getSearchSuggestions(inputValue)
          setSuggestions(suggestions)
        } catch (error) {
          console.error('Failed to fetch suggestions:', error)
          setSuggestions([])
        } finally {
          setLoadingSuggestions(false)
        }
      } else {
        setSuggestions([])
      }
    }, 300),
    []
  )

  const handleInputChange = (_event: React.SyntheticEvent, value: string) => {
    dispatch(setQuery(value))
    debouncedGetSuggestions(value)
  }

  const handleSearch = () => {
    dispatch(searchSchools({ query, filters }) as any)
    onSearch?.(query)
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch()
    }
  }

  const handleClear = () => {
    dispatch(setQuery(''))
    setSuggestions([])
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 600 }}>
      <Autocomplete
        freeSolo
        options={suggestions}
        value={query}
        onInputChange={handleInputChange}
        loading={loadingSuggestions}
        renderInput={(params) => (
          <TextField
            {...params}
            fullWidth
            placeholder={placeholder}
            variant="outlined"
            onKeyPress={handleKeyPress}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <IconButton
                    onClick={handleSearch}
                    disabled={isLoading}
                    size="small"
                  >
                    {isLoading ? (
                      <CircularProgress size={20} />
                    ) : (
                      <SearchIcon />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
              endAdornment: (
                <>
                  {query && (
                    <InputAdornment position="end">
                      <IconButton onClick={handleClear} size="small">
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  )}
                  {loadingSuggestions && (
                    <InputAdornment position="end">
                      <CircularProgress size={16} />
                    </InputAdornment>
                  )}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => (
          <li {...props} key={option}>
            {option}
          </li>
        )}
      />
    </Box>
  )
}

export default SearchInput