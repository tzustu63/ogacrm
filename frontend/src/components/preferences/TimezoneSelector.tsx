import React, { useState, useMemo } from 'react'
import {
  Box,
  TextField,
  Autocomplete,
  Typography,
  Chip,
  Paper,
} from '@mui/material'
import { AccessTime as TimeIcon } from '@mui/icons-material'

interface TimezoneOption {
  value: string
  label: string
  offset: string
  region: string
}

interface TimezoneSelectorProps {
  value?: string
  onChange: (timezone: string) => void
  label?: string
  error?: boolean
  helperText?: string
  fullWidth?: boolean
}

// Comprehensive timezone list organized by regions
const TIMEZONE_DATA: TimezoneOption[] = [
  // Asia Pacific
  { value: 'Asia/Taipei', label: '台北', offset: 'GMT+8', region: '亞太地區' },
  { value: 'Asia/Shanghai', label: '上海', offset: 'GMT+8', region: '亞太地區' },
  { value: 'Asia/Hong_Kong', label: '香港', offset: 'GMT+8', region: '亞太地區' },
  { value: 'Asia/Singapore', label: '新加坡', offset: 'GMT+8', region: '亞太地區' },
  { value: 'Asia/Tokyo', label: '東京', offset: 'GMT+9', region: '亞太地區' },
  { value: 'Asia/Seoul', label: '首爾', offset: 'GMT+9', region: '亞太地區' },
  { value: 'Asia/Bangkok', label: '曼谷', offset: 'GMT+7', region: '亞太地區' },
  { value: 'Asia/Jakarta', label: '雅加達', offset: 'GMT+7', region: '亞太地區' },
  { value: 'Asia/Kuala_Lumpur', label: '吉隆坡', offset: 'GMT+8', region: '亞太地區' },
  { value: 'Asia/Manila', label: '馬尼拉', offset: 'GMT+8', region: '亞太地區' },
  { value: 'Australia/Sydney', label: '雪梨', offset: 'GMT+10', region: '亞太地區' },
  { value: 'Australia/Melbourne', label: '墨爾本', offset: 'GMT+10', region: '亞太地區' },
  { value: 'Pacific/Auckland', label: '奧克蘭', offset: 'GMT+12', region: '亞太地區' },

  // Europe
  { value: 'Europe/London', label: '倫敦', offset: 'GMT+0', region: '歐洲' },
  { value: 'Europe/Paris', label: '巴黎', offset: 'GMT+1', region: '歐洲' },
  { value: 'Europe/Berlin', label: '柏林', offset: 'GMT+1', region: '歐洲' },
  { value: 'Europe/Rome', label: '羅馬', offset: 'GMT+1', region: '歐洲' },
  { value: 'Europe/Madrid', label: '馬德里', offset: 'GMT+1', region: '歐洲' },
  { value: 'Europe/Amsterdam', label: '阿姆斯特丹', offset: 'GMT+1', region: '歐洲' },
  { value: 'Europe/Zurich', label: '蘇黎世', offset: 'GMT+1', region: '歐洲' },
  { value: 'Europe/Moscow', label: '莫斯科', offset: 'GMT+3', region: '歐洲' },

  // Americas
  { value: 'America/New_York', label: '紐約', offset: 'GMT-5', region: '美洲' },
  { value: 'America/Los_Angeles', label: '洛杉磯', offset: 'GMT-8', region: '美洲' },
  { value: 'America/Chicago', label: '芝加哥', offset: 'GMT-6', region: '美洲' },
  { value: 'America/Denver', label: '丹佛', offset: 'GMT-7', region: '美洲' },
  { value: 'America/Toronto', label: '多倫多', offset: 'GMT-5', region: '美洲' },
  { value: 'America/Vancouver', label: '溫哥華', offset: 'GMT-8', region: '美洲' },
  { value: 'America/Mexico_City', label: '墨西哥城', offset: 'GMT-6', region: '美洲' },
  { value: 'America/Sao_Paulo', label: '聖保羅', offset: 'GMT-3', region: '美洲' },

  // Middle East & Africa
  { value: 'Asia/Dubai', label: '杜拜', offset: 'GMT+4', region: '中東非洲' },
  { value: 'Asia/Riyadh', label: '利雅德', offset: 'GMT+3', region: '中東非洲' },
  { value: 'Africa/Cairo', label: '開羅', offset: 'GMT+2', region: '中東非洲' },
  { value: 'Africa/Johannesburg', label: '約翰尼斯堡', offset: 'GMT+2', region: '中東非洲' },
]

const TimezoneSelector: React.FC<TimezoneSelectorProps> = ({
  value,
  onChange,
  label = '時區',
  error = false,
  helperText,
  fullWidth = true,
}) => {
  const [searchText, setSearchText] = useState('')

  const selectedTimezone = useMemo(() => {
    return TIMEZONE_DATA.find(tz => tz.value === value)
  }, [value])

  const filteredTimezones = useMemo(() => {
    if (!searchText) return TIMEZONE_DATA

    const searchLower = searchText.toLowerCase()
    return TIMEZONE_DATA.filter(tz =>
      tz.label.toLowerCase().includes(searchLower) ||
      tz.offset.toLowerCase().includes(searchLower) ||
      tz.region.toLowerCase().includes(searchLower)
    )
  }, [searchText])



  const getCurrentTime = (timezone: string) => {
    try {
      return new Date().toLocaleTimeString('zh-TW', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '--:--'
    }
  }

  return (
    <Box>
      <Autocomplete
        fullWidth={fullWidth}
        value={selectedTimezone || null}
        onChange={(_, newValue) => {
          if (newValue) {
            onChange(newValue.value)
          }
        }}
        inputValue={searchText}
        onInputChange={(_, newInputValue) => {
          setSearchText(newInputValue)
        }}
        options={filteredTimezones}
        groupBy={(option) => option.region}
        getOptionLabel={(option) => `${option.label} (${option.offset})`}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            error={error}
            helperText={helperText}
            InputProps={{
              ...params.InputProps,
              startAdornment: <TimeIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        )}
        renderOption={(props, option) => (
          <li {...props} key={option.value}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Box>
                <Typography variant="body2">
                  {option.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.offset}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {getCurrentTime(option.value)}
              </Typography>
            </Box>
          </li>
        )}
        renderGroup={(params) => (
          <li key={params.key}>
            <Typography
              variant="subtitle2"
              sx={{
                px: 2,
                py: 1,
                bgcolor: 'grey.100',
                fontWeight: 'medium',
              }}
            >
              {params.group}
            </Typography>
            <ul style={{ padding: 0 }}>{params.children}</ul>
          </li>
        )}
        noOptionsText="找不到符合的時區"
      />

      {/* Current Time Display */}
      {selectedTimezone && (
        <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimeIcon color="primary" />
            <Typography variant="body2">
              {selectedTimezone.label} 當前時間:
            </Typography>
            <Chip
              label={getCurrentTime(selectedTimezone.value)}
              color="primary"
              size="small"
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            時區: {selectedTimezone.value} ({selectedTimezone.offset})
          </Typography>
        </Paper>
      )}
    </Box>
  )
}

export default TimezoneSelector