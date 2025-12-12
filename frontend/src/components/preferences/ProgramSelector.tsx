import React, { useState, useMemo } from 'react'
import {
  Box,
  TextField,
  Autocomplete,
  Chip,
  Typography,
  Paper,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Checkbox,
} from '@mui/material'
import {
  School as SchoolIcon,
  Category as CategoryIcon,
} from '@mui/icons-material'

interface ProgramCategory {
  name: string
  programs: string[]
}

interface ProgramSelectorProps {
  value: string[]
  onChange: (programs: string[]) => void
  label?: string
  error?: boolean
  helperText?: string
  maxSelections?: number
}

// Organized program categories
const PROGRAM_CATEGORIES: ProgramCategory[] = [
  {
    name: '工程學院',
    programs: [
      '資訊工程學系',
      '電機工程學系',
      '機械工程學系',
      '化學工程學系',
      '土木工程學系',
      '工業工程學系',
      '材料科學與工程學系',
      '生物醫學工程學系',
      '環境工程學系',
      '航空工程學系',
    ],
  },
  {
    name: '商學院',
    programs: [
      '企業管理學系',
      '財務金融學系',
      '會計學系',
      '國際貿易學系',
      '行銷學系',
      '人力資源管理學系',
      '資訊管理學系',
      '經濟學系',
      '統計學系',
    ],
  },
  {
    name: '設計學院',
    programs: [
      '視覺傳達設計學系',
      '數位媒體設計學系',
      '工業設計學系',
      '建築學系',
      '室內設計學系',
      '服裝設計學系',
      '景觀設計學系',
      '多媒體設計學系',
    ],
  },
  {
    name: '文學院',
    programs: [
      '應用外語學系',
      '中國文學系',
      '英美語文學系',
      '日本語文學系',
      '韓國語文學系',
      '翻譯學系',
      '大眾傳播學系',
      '新聞學系',
      '廣告學系',
    ],
  },
  {
    name: '理學院',
    programs: [
      '數學系',
      '物理學系',
      '化學系',
      '生物學系',
      '地理學系',
      '心理學系',
      '資訊科學系',
      '應用數學系',
    ],
  },
  {
    name: '醫學院',
    programs: [
      '醫學系',
      '牙醫學系',
      '藥學系',
      '護理學系',
      '物理治療學系',
      '職能治療學系',
      '醫學檢驗學系',
      '營養學系',
    ],
  },
  {
    name: '法學院',
    programs: [
      '法律學系',
      '政治學系',
      '公共行政學系',
      '社會學系',
      '社會工作學系',
      '國際關係學系',
    ],
  },
]

const ProgramSelector: React.FC<ProgramSelectorProps> = ({
  value,
  onChange,
  label = '感興趣的科系',
  error = false,
  helperText,
  maxSelections,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false)

  const allPrograms = useMemo(() => {
    return PROGRAM_CATEGORIES.flatMap(category => category.programs)
  }, [])

  const handleProgramToggle = (program: string) => {
    const currentIndex = value.indexOf(program)
    const newValue = [...value]

    if (currentIndex === -1) {
      // Add program if not selected and under limit
      if (!maxSelections || newValue.length < maxSelections) {
        newValue.push(program)
      }
    } else {
      // Remove program if already selected
      newValue.splice(currentIndex, 1)
    }

    onChange(newValue)
  }

  const handleCategorySelect = (categoryName: string) => {
    const category = PROGRAM_CATEGORIES.find(cat => cat.name === categoryName)
    if (!category) return

    const categoryPrograms = category.programs
    const allSelected = categoryPrograms.every(program => value.includes(program))

    if (allSelected) {
      // Deselect all programs in category
      const newValue = value.filter(program => !categoryPrograms.includes(program))
      onChange(newValue)
    } else {
      // Select all programs in category (respecting max limit)
      const newValue = [...value]
      categoryPrograms.forEach(program => {
        if (!newValue.includes(program)) {
          if (!maxSelections || newValue.length < maxSelections) {
            newValue.push(program)
          }
        }
      })
      onChange(newValue)
    }
  }

  const getCategorySelectionState = (categoryName: string) => {
    const category = PROGRAM_CATEGORIES.find(cat => cat.name === categoryName)
    if (!category) return 'none'

    const selectedCount = category.programs.filter(program => value.includes(program)).length
    const totalCount = category.programs.length

    if (selectedCount === 0) return 'none'
    if (selectedCount === totalCount) return 'all'
    return 'partial'
  }

  return (
    <Box>
      <Autocomplete
        multiple
        freeSolo
        options={allPrograms}
        value={value}
        onChange={(_, newValue) => {
          if (!maxSelections || newValue.length <= maxSelections) {
            onChange(newValue)
          }
        }}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => (
            <Chip
              variant="outlined"
              label={option}
              {...getTagProps({ index })}
              key={option}
              color="primary"
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            error={error}
            helperText={helperText || (maxSelections ? `最多可選擇 ${maxSelections} 個科系` : '可選擇多個科系')}
            placeholder="輸入或選擇科系名稱"
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                  <SchoolIcon sx={{ color: 'text.secondary' }} />
                  {params.InputProps.startAdornment}
                </Box>
              ),
            }}
          />
        )}
        renderOption={(props, option) => (
          <li {...props} key={option}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Checkbox
                checked={value.includes(option)}
                disabled={!value.includes(option) && maxSelections ? value.length >= maxSelections : false}
              />
              <Typography variant="body2">{option}</Typography>
            </Box>
          </li>
        )}
        noOptionsText="找不到符合的科系"
      />

      {/* Quick Selection Button */}
      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<CategoryIcon />}
          onClick={() => setDialogOpen(true)}
          size="small"
        >
          按學院選擇
        </Button>
        {value.length > 0 && (
          <Button
            variant="outlined"
            color="error"
            onClick={() => onChange([])}
            size="small"
          >
            清除全部
          </Button>
        )}
      </Box>

      {/* Selected Programs Summary */}
      {value.length > 0 && (
        <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            已選擇 {value.length} 個科系
            {maxSelections && ` (最多 ${maxSelections} 個)`}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {value.map((program) => (
              <Chip
                key={program}
                label={program}
                size="small"
                onDelete={() => handleProgramToggle(program)}
                color="primary"
                variant="filled"
              />
            ))}
          </Box>
        </Paper>
      )}

      {/* Category Selection Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CategoryIcon />
            按學院選擇科系
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {PROGRAM_CATEGORIES.map((category) => {
              const selectionState = getCategorySelectionState(category.name)
              return (
                <Grid item xs={12} md={6} key={category.name}>
                  <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h6" color="primary">
                        {category.name}
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => handleCategorySelect(category.name)}
                        color={selectionState === 'all' ? 'error' : 'primary'}
                      >
                        {selectionState === 'all' ? '取消全選' : '全選'}
                      </Button>
                    </Box>
                    <List dense>
                      {category.programs.map((program) => (
                        <ListItem key={program} disablePadding>
                          <ListItemButton
                            onClick={() => handleProgramToggle(program)}
                            disabled={!value.includes(program) && maxSelections ? value.length >= maxSelections : false}
                          >
                            <Checkbox
                              checked={value.includes(program)}
                              disabled={!value.includes(program) && maxSelections ? value.length >= maxSelections : false}
                            />
                            <ListItemText
                              primary={program}
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Grid>
              )
            })}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto' }}>
            已選擇 {value.length} 個科系
            {maxSelections && ` / ${maxSelections}`}
          </Typography>
          <Button onClick={() => setDialogOpen(false)}>
            完成
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ProgramSelector