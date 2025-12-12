import React, { useState, useRef } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
  CircularProgress,
  Typography,
  Checkbox,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material'
import { importApi, ImportResult } from '../../services/api/import'
import { FileDownload as FileDownloadIcon } from '@mui/icons-material'

interface ImportDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const ImportDialog: React.FC<ImportDialogProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [skipErrors, setSkipErrors] = useState(false)
  const [updateExisting, setUpdateExisting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)


  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      // Validate file by extension (more reliable than MIME type)
      const fileName = selectedFile.name.toLowerCase()
      const validExtensions = ['.xlsx', '.xls']
      const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext))
      
      // Also check MIME type as secondary validation
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/vnd.ms-excel.sheet.macroEnabled.12',
        'application/octet-stream' // Some systems may use this
      ]
      const hasValidType = validTypes.includes(selectedFile.type) || selectedFile.type === ''
      
      if (!hasValidExtension && !hasValidType) {
        setError('請選擇 Excel 檔案 (.xlsx 或 .xls)')
        return
      }
      
      setFile(selectedFile)
      setError(null)
      setImportResult(null)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const blob = await importApi.downloadTemplate()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = '學校匯入範本.xlsx'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('下載範本失敗:', error)
      setError('下載範本失敗，請稍後再試')
    }
  }

  const handleImport = async () => {
    if (!file) {
      setError('請選擇要匯入的檔案')
      return
    }

    try {
      setIsImporting(true)
      setError(null)
      const response = await importApi.importSchools(file, {
        skipErrors,
        updateExisting
      })
      const result = (response as any).data || response
      setImportResult(result)
      
      if (result?.failed === 0 || (skipErrors && result?.success > 0)) {
        setTimeout(() => {
          onSuccess()
        }, 2000)
      }
    } catch (err: any) {
      console.error('匯入失敗:', err)
      setError(err.response?.data?.error?.message || err.message || '匯入失敗，請檢查檔案格式')
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setSkipErrors(false)
    setUpdateExisting(false)
    setImportResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      disableEnforceFocus
    >
      <DialogTitle>匯入學校資料</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          {error && (
            <Alert severity="error">{error}</Alert>
          )}

          {importResult && (
            <Alert severity={importResult.failed === 0 ? 'success' : 'warning'}>
              <Typography variant="body2" gutterBottom>
                匯入完成：成功 {importResult.success} 筆，失敗 {importResult.failed} 筆
              </Typography>
              {importResult.errors.length > 0 && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  錯誤詳情請查看下方列表
                </Typography>
              )}
            </Alert>
          )}

          <Box>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleDownloadTemplate}
              size="small"
            >
              下載匯入範本
            </Button>
          </Box>

          <Box>
            <input
              ref={fileInputRef}
              id="file-upload-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <label htmlFor="file-upload-input">
              <Button
                variant="outlined"
                component="span"
                fullWidth
              >
                {file ? file.name : '選擇 Excel 檔案'}
              </Button>
            </label>
          </Box>

          <Box display="flex" flexDirection="column" gap={1}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={skipErrors}
                  onChange={(e) => setSkipErrors(e.target.checked)}
                />
              }
              label="跳過錯誤行，繼續匯入"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                />
              }
              label="若學校名稱已存在，則更新資料"
            />
          </Box>

          {importResult && importResult.errors.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                錯誤列表：
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>行號</TableCell>
                      <TableCell>學校名稱</TableCell>
                      <TableCell>錯誤訊息</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {importResult.errors.map((err, index) => (
                      <TableRow key={index}>
                        <TableCell>{err.row}</TableCell>
                        <TableCell>{err.schoolName || '-'}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="error">
                            {err.error}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isImporting}>
          關閉
        </Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={!file || isImporting}
          startIcon={isImporting ? <CircularProgress size={20} /> : null}
        >
          {isImporting ? '匯入中...' : '開始匯入'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ImportDialog
