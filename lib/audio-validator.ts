// Audio validation utility for MEUWSIC
import { parseBuffer } from 'music-metadata'

export interface AudioValidationResult {
  isValid: boolean
  duration: number
  actualDuration?: number
  bitrate?: number
  sampleRate?: number
  format?: string
  errors: string[]
  warnings: string[]
}

export class AudioValidator {
  /**
   * Validate audio file buffer and extract accurate metadata
   */
  static async validateAudioBuffer(buffer: Buffer, filename: string): Promise<AudioValidationResult> {
    const result: AudioValidationResult = {
      isValid: false,
      duration: 0,
      errors: [],
      warnings: []
    }

    try {
      // Parse metadata with multiple attempts for accuracy
      const metadata = await parseBuffer(buffer, { duration: true, skipCovers: true } as any)
      
      if (!metadata.format) {
        result.errors.push('No format information found in audio file')
        return result
      }

      // Extract duration with validation
      const duration = metadata.format.duration
      if (!duration || duration <= 0) {
        result.errors.push('Invalid or missing duration in audio metadata')
        return result
      }

      // Validate audio format
      const container = metadata.format.container
      const codec = metadata.format.codec
      
      if (!container) {
        result.warnings.push('Unknown audio container format')
      }

      // Check for common problematic formats
      const supportedFormats = ['MP3', 'FLAC', 'OGG', 'M4A', 'WAV']
      if (container && !supportedFormats.includes(container.toUpperCase())) {
        result.warnings.push(`Audio format ${container} may have compatibility issues`)
      }

      // Validate bitrate
      const bitrate = metadata.format.bitrate
      if (bitrate && bitrate < 64000) {
        result.warnings.push(`Low bitrate detected: ${Math.round(bitrate/1000)}kbps`)
      }

      // Validate sample rate
      const sampleRate = metadata.format.sampleRate
      if (sampleRate && sampleRate < 22050) {
        result.warnings.push(`Low sample rate detected: ${sampleRate}Hz`)
      }

      // Additional validation: Check for truncated files
      const expectedSize = this.estimateFileSize(duration, bitrate || 128000)
      const actualSize = buffer.length
      const sizeDifference = Math.abs(actualSize - expectedSize) / expectedSize

      if (sizeDifference > 0.3) { // 30% difference threshold
        result.warnings.push(`File size mismatch detected - possible truncation or corruption`)
      }

      // Success case
      result.isValid = true
      result.duration = Math.round(duration)
      result.actualDuration = duration
      result.bitrate = bitrate ? Math.round(bitrate) : undefined
      result.sampleRate = sampleRate ? Math.round(sampleRate) : undefined
      result.format = container || 'Unknown'

      return result

    } catch (error) {
      result.errors.push(`Metadata parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      // Fallback: Try to estimate duration from file size (rough estimate)
      try {
        const estimatedDuration = this.estimateDurationFromSize(buffer.length, filename)
        if (estimatedDuration > 0) {
          result.warnings.push('Using estimated duration due to metadata parsing failure')
          result.duration = estimatedDuration
          result.isValid = true
        }
      } catch (fallbackError) {
        result.errors.push('Could not estimate duration from file size')
      }

      return result
    }
  }

  /**
   * Estimate file size based on duration and bitrate
   */
  private static estimateFileSize(durationSeconds: number, bitratePerSecond: number): number {
    return Math.round((durationSeconds * bitratePerSecond) / 8)
  }

  /**
   * Fallback: Estimate duration from file size (very rough)
   */
  private static estimateDurationFromSize(fileSize: number, filename: string): number {
    // Very rough estimates based on common bitrates
    const extension = filename.split('.').pop()?.toLowerCase()
    
    let estimatedBitrate = 128000 // Default 128kbps
    
    switch (extension) {
      case 'flac':
        estimatedBitrate = 1000000 // ~1Mbps for FLAC
        break
      case 'wav':
        estimatedBitrate = 1411200 // CD quality PCM
        break
      case 'mp3':
        estimatedBitrate = 128000 // Common MP3 bitrate
        break
      case 'm4a':
      case 'aac':
        estimatedBitrate = 128000 // Common AAC bitrate
        break
    }

    return Math.round((fileSize * 8) / estimatedBitrate)
  }

  /**
   * Validate uploaded audio and provide recommendations
   */
  static async validateUpload(buffer: Buffer, filename: string): Promise<{
    validation: AudioValidationResult
    recommendations: string[]
  }> {
    const validation = await this.validateAudioBuffer(buffer, filename)
    const recommendations: string[] = []

    if (!validation.isValid) {
      recommendations.push('File rejected due to validation errors')
      recommendations.push('Try re-encoding the audio file with a standard format (MP3, FLAC)')
    } else {
      if (validation.warnings.length > 0) {
        recommendations.push('File accepted with warnings - monitor playback quality')
      }
      
      if (validation.duration > 600) { // 10 minutes
        recommendations.push('Long audio file detected - ensure adequate storage and bandwidth')
      }
      
      if (validation.bitrate && validation.bitrate > 320000) {
        recommendations.push('High bitrate detected - consider compression for better streaming')
      }
    }

    return { validation, recommendations }
  }
}