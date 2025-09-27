import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface UploadStats {
  totalUploads: number
  successfulUploads: number
  failedUploads: number
  successRate: number
  recentUploads: Array<{
    id: string
    title: string
    filename: string
    fileSize: number
    createdAt: string
    status: 'success' | 'failed'
    errorMessage?: string
  }>
  errorBreakdown: Array<{
    errorType: string
    count: number
    percentage: number
  }>
}

const UploadReport: React.FC = () => {
  const [stats, setStats] = useState<UploadStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/upload-report')
      if (!response.ok) {
        throw new Error('Failed to fetch upload statistics')
      }
      const data = await response.json()
      setStats(data)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getErrorTypeLabel = (errorType: string) => {
    const labels: Record<string, string> = {
      'audio_validation': 'Audio Validation',
      'database': 'Database Error',
      'cloudflare_r2': 'Cloudflare R2',
      'network': 'Network Error',
      'file_size': 'File Size',
      'file_format': 'File Format',
      'unknown': 'Unknown Error'
    }
    return labels[errorType] || errorType
  }

  const getErrorTypeColor = (errorType: string) => {
    const colors: Record<string, string> = {
      'audio_validation': 'bg-yellow-100 text-yellow-800',
      'database': 'bg-red-100 text-red-800',
      'cloudflare_r2': 'bg-blue-100 text-blue-800',
      'network': 'bg-purple-100 text-purple-800',
      'file_size': 'bg-orange-100 text-orange-800',
      'file_format': 'bg-pink-100 text-pink-800',
      'unknown': 'bg-gray-100 text-gray-800'
    }
    return colors[errorType] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading Upload Report...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            Error Loading Upload Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchStats} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Uploads</p>
                <p className="text-2xl font-bold">{stats.totalUploads}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Successful</p>
                <p className="text-2xl font-bold text-green-600">{stats.successfulUploads}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failedUploads}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold">{stats.successRate}%</p>
              </div>
              {stats.successRate >= 80 ? (
                <TrendingUp className="h-8 w-8 text-green-600" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Breakdown */}
      {stats.errorBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Error Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.errorBreakdown.map((error, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className={getErrorTypeColor(error.errorType)}>
                      {getErrorTypeLabel(error.errorType)}
                    </Badge>
                    <span className="text-sm text-gray-600">{error.count} occurrences</span>
                  </div>
                  <span className="text-sm font-medium">{error.percentage}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Uploads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Upload Attempts</CardTitle>
          <Button onClick={fetchStats} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentUploads.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent uploads</p>
            ) : (
              stats.recentUploads.map((upload) => (
                <div key={upload.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {upload.status === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium">{upload.title}</p>
                      <p className="text-sm text-gray-600">{upload.filename}</p>
                      {upload.errorMessage && (
                        <p className="text-sm text-red-600 mt-1">{upload.errorMessage}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <p>{formatFileSize(upload.fileSize)}</p>
                    <p>{formatDate(upload.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default UploadReport