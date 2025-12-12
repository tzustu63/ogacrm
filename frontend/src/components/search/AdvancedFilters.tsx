import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Grid,
  Collapse,
  IconButton,
  Divider,
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
} from '@mui/icons-material'
import { useDispatch, useSelector } from 'react-redux'
import { setFilters, clearFilters, searchSchools } from '@/store/slices/searchSlice'
import { SearchFilters, SchoolType, RelationshipStatus, MOUStatus } from '@/types'
import { searchApi } from '@/services/api'

interface FilterOptions {
  countries: string[]
  regions: string[]
  schoolTypes: string[]
  relationshipStatuses: string[]
}

const AdvancedFilters: React.FC = () => {
  const dispatch = useDispatch()
  const filters = useSelector((state: any) => state.search?.filters || {})
  const query = useSelector((state: any) => state.search?.query || '')
  const [expanded, setExpanded] = useState(false)
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    countries: [],
    regions: [],
    schoolTypes: Object.values(SchoolType),
    relationshipStatuses: Object.values(RelationshipStatus),
  })

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const options = await searchApi.getFilterOptions()
        setFilterOptions(prev => ({
          ...prev,
          countries: options.countries,
          regions: options.regions,
        }))
      } catch (error) {
        console.error('Failed to load filter options:', error)
      }
    }

    loadFilterOptions()
  }, [])

  const handleFilterChange = (key: keyof SearchFilters, value: string | null) => {
    const newFilters = { ...filters }
    if (value) {
      newFilters[key] = value as any
    } else {
      delete newFilters[key]
    }
    dispatch(setFilters(newFilters))
  }

  const handleApplyFilters = () => {
    dispatch(searchSchools({ query, filters }) as any)
  }

  const handleClearFilters = () => {
    dispatch(clearFilters())
  }

  const getActiveFiltersCount = () => {
    return Object.keys(filters).filter(key => filters[key as keyof SearchFilters]).length
  }

  const getFilterLabel = (key: keyof SearchFilters, value: string) => {
    const labels: Record<string, Record<string, string>> = {
      schoolType: {
        high_school: '高中',
        university: '大學',
        vocational: '技職學校',
        other: '其他',
      },
      relationshipStatus: {
        potential: '潛在',
        active: '活躍',
        partnered: '合作中',
        paused: '暫停',
      },
      mouStatus: {
        none: '無',
        negotiating: '洽談中',
        signed: '已簽訂',
        expired: '已到期',
      },
    }

    return labels[key]?.[value] || value
  }

  const activeFiltersCount = getActiveFiltersCount()

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterIcon />
          <Typography variant="h6">進階篩選</Typography>
          {activeFiltersCount > 0 && (
            <Chip
              label={`${activeFiltersCount} 個篩選條件`}
              size="small"
              color="primary"
            />
          )}
        </Box>
        <IconButton
          onClick={() => setExpanded(!expanded)}
          sx={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s',
          }}
        >
          <ExpandMoreIcon />
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>國家</InputLabel>
              <Select
                value={filters.country || ''}
                label="國家"
                onChange={(e) => handleFilterChange('country', e.target.value || null)}
              >
                <MenuItem value="">
                  <em>全部</em>
                </MenuItem>
                {filterOptions.countries.map((country) => (
                  <MenuItem key={country} value={country}>
                    {country}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>地區</InputLabel>
              <Select
                value={filters.region || ''}
                label="地區"
                onChange={(e) => handleFilterChange('region', e.target.value || null)}
              >
                <MenuItem value="">
                  <em>全部</em>
                </MenuItem>
                {filterOptions.regions.map((region) => (
                  <MenuItem key={region} value={region}>
                    {region}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>學校類型</InputLabel>
              <Select
                value={filters.schoolType || ''}
                label="學校類型"
                onChange={(e) => handleFilterChange('schoolType', e.target.value || null)}
              >
                <MenuItem value="">
                  <em>全部</em>
                </MenuItem>
                {filterOptions.schoolTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {getFilterLabel('schoolType', type)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>關係狀態</InputLabel>
              <Select
                value={filters.relationshipStatus || ''}
                label="關係狀態"
                onChange={(e) => handleFilterChange('relationshipStatus', e.target.value || null)}
              >
                <MenuItem value="">
                  <em>全部</em>
                </MenuItem>
                {filterOptions.relationshipStatuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {getFilterLabel('relationshipStatus', status)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>MOU狀態</InputLabel>
              <Select
                value={filters.mouStatus || ''}
                label="MOU狀態"
                onChange={(e) => handleFilterChange('mouStatus', e.target.value || null)}
              >
                <MenuItem value="">
                  <em>全部</em>
                </MenuItem>
                {Object.values(MOUStatus).map((status) => (
                  <MenuItem key={status} value={status}>
                    {getFilterLabel('mouStatus', status)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              已選擇的篩選條件:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(filters).map(([key, value]) => {
                if (!value) return null
                return (
                  <Chip
                    key={key}
                    label={`${key === 'country' ? '國家' : 
                           key === 'region' ? '地區' :
                           key === 'schoolType' ? '學校類型' :
                           key === 'relationshipStatus' ? '關係狀態' :
                           key === 'mouStatus' ? 'MOU狀態' : key}: ${getFilterLabel(key as keyof SearchFilters, value as string)}`}
                    onDelete={() => handleFilterChange(key as keyof SearchFilters, null)}
                    size="small"
                    variant="outlined"
                  />
                )
              })}
            </Box>
          </Box>
        )}

        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            onClick={handleApplyFilters}
            startIcon={<FilterIcon />}
          >
            套用篩選
          </Button>
          <Button
            variant="outlined"
            onClick={handleClearFilters}
            startIcon={<ClearIcon />}
            disabled={activeFiltersCount === 0}
          >
            清除篩選
          </Button>
        </Box>
      </Collapse>
    </Paper>
  )
}

export default AdvancedFilters