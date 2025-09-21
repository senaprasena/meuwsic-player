'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Shuffle, 
  Repeat,
  Music
} from 'lucide-react'

interface Track {
  id: number
  title: string
  artist: string
  filename: string
  duration: number
}

const TRACKS: Track[] = [
  { id: 1, title: "A Morning Hum (Remix)", artist: "HMS", filename: "A Morning Hum (Remix) - HMS.mp3", duration: 0 },
  { id: 2, title: "Possesive Cyborg Maid", artist: "HMS", filename: "Possesive Cyborg Maid - HMS.mp3", duration: 0 },
  { id: 3, title: "Nur Wenn Ich Will (AI-Prinz)", artist: "HMS", filename: "\u201eNur Wenn Ich Will (AI-Prinz)\u201c - HMS.mp3", duration: 0 },
  { id: 4, title: "冬の神話 (Fuyu no Shinwa) — Winter Myth", artist: "HMS", filename: "\u300c冬の神話 (Fuyu no Shinwa) — Winter Myth\u300d - HMS.mp3", duration: 0 },
  { id: 5, title: "ポモドーロ・ラブ - 真道もも (Pomodoro LOVE! - Mado Momo)", artist: "HMS", filename: "ポモドーロ・ラブ - 真道もも (Pomodoro LOVE! - Mado Momo) - HMS.mp3", duration: 0 },
  { id: 6, title: "花の香りに (Hana no Kaori ni) Glam Rock Live", artist: "差乃間・ミッチ", filename: "🌸 花の香りに (Hana no Kaori ni) 🌸 Glam Rock Live - 差乃間・ミッチ.mp3", duration: 0 },
  { id: 7, title: "I Am the Dream Dreaming Me", artist: "HMS", filename: "🔥 _I Am the Dream Dreaming Me_ - HMS.mp3", duration: 0 }
]

export default function MusicPlayer() {
  const [currentTrack, setCurrentTrack] = useState<Track>(TRACKS[0])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const [isShuffled, setIsShuffled] = useState(false)
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none')
  const [showPlaylist, setShowPlaylist] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration)
      }
    }
    const handleEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0
        audio.play()
      } else if (isShuffled) {
        // When shuffle is on, always continue to next random song regardless of repeat mode
        handleNext()
      } else if (repeatMode === 'none') {
        // Check if we're at the last song (only when shuffle is OFF)
        const currentIndex = TRACKS.findIndex(track => track.id === currentTrack.id)
        if (currentIndex === TRACKS.length - 1) {
          // Stay on the last song and stop playing
          setIsPlaying(false)
        } else {
          handleNext()
        }
      } else {
        handleNext()
      }
    }
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleLoadStart = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('durationchange', updateDuration)
    audio.addEventListener('canplay', updateDuration)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('loadstart', handleLoadStart)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('durationchange', updateDuration)
      audio.removeEventListener('canplay', updateDuration)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('loadstart', handleLoadStart)
    }
  }, [currentTrack, repeatMode, isShuffled])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  const handlePlay = async () => {
    if (!audioRef.current) return
    
    try {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        await audioRef.current.play()
      }
    } catch (error) {
      console.error('Error playing audio:', error)
      setIsPlaying(false)
    }
  }

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
      setCurrentTime(0)
    }
  }

  const handleNext = () => {
    const currentIndex = TRACKS.findIndex(track => track.id === currentTrack.id)
    let nextIndex
    
    if (isShuffled) {
      // Shuffle mode: always pick random song and continue playing
      do {
        nextIndex = Math.floor(Math.random() * TRACKS.length)
      } while (nextIndex === currentIndex && TRACKS.length > 1)
    } else if (repeatMode === 'all') {
      nextIndex = (currentIndex + 1) % TRACKS.length
    } else {
      // When repeat is 'none' and shuffle is OFF, respect boundaries
      if (currentIndex === TRACKS.length - 1) {
        nextIndex = 0 // Go to first track but don't auto-play
      } else {
        nextIndex = currentIndex + 1
      }
    }
    
    const wasPlaying = isPlaying
    setCurrentTrack(TRACKS[nextIndex])
    
    // For shuffle mode, always continue playing. For others, respect the wasPlaying state
    if (wasPlaying || isShuffled) {
      setTimeout(async () => {
        try {
          await audioRef.current?.play()
        } catch (error) {
          console.error('Error playing next track:', error)
          setIsPlaying(false)
        }
      }, 100)
    }
  }

  const handlePrevious = () => {
    const currentIndex = TRACKS.findIndex(track => track.id === currentTrack.id)
    let prevIndex
    
    if (isShuffled) {
      do {
        prevIndex = Math.floor(Math.random() * TRACKS.length)
      } while (prevIndex === currentIndex && TRACKS.length > 1)
    } else if (repeatMode === 'all') {
      prevIndex = currentIndex === 0 ? TRACKS.length - 1 : currentIndex - 1
    } else {
      // When repeat is 'none', allow navigation but don't auto-play at boundaries
      if (currentIndex === 0) {
        prevIndex = TRACKS.length - 1 // Go to last track but don't auto-play
      } else {
        prevIndex = currentIndex - 1
      }
    }
    
    const wasPlaying = isPlaying
    setCurrentTrack(TRACKS[prevIndex])
    
    // Always continue playing if was playing, regardless of boundaries for manual navigation
    if (wasPlaying) {
      setTimeout(async () => {
        try {
          await audioRef.current?.play()
        } catch (error) {
          console.error('Error playing previous track:', error)
          setIsPlaying(false)
        }
      }, 100)
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !audioRef.current) return
    
    const rect = progressRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickPercentage = Math.max(0, Math.min(clickX / rect.width, 1))
    
    // Use the audio element's duration directly, or fall back to state duration
    const audioDuration = audioRef.current.duration || duration
    if (!audioDuration || isNaN(audioDuration)) return
    
    const newTime = clickPercentage * audioDuration
    
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const toggleShuffle = () => {
    setIsShuffled(!isShuffled)
  }

  const toggleRepeat = () => {
    const modes: ('none' | 'one' | 'all')[] = ['none', 'one', 'all']
    const currentIndex = modes.indexOf(repeatMode)
    setRepeatMode(modes[(currentIndex + 1) % modes.length])
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const selectTrack = (track: Track) => {
    const wasPlaying = isPlaying
    setCurrentTrack(track)
    setShowPlaylist(false)
    if (wasPlaying) {
      setTimeout(async () => {
        try {
          await audioRef.current?.play()
        } catch (error) {
          console.error('Error playing selected track:', error)
          setIsPlaying(false)
        }
      }, 100)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-black/30 backdrop-blur-lg rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white/10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: isPlaying ? 360 : 0 }}
            transition={{ duration: 3, repeat: isPlaying ? Infinity : 0, ease: "linear" }}
            className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Music className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white mb-2">Meuwsic Player</h1>
        </div>

        {/* Track Info */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-white mb-2 truncate">
            {currentTrack.title}
          </h2>
          <p className="text-gray-300 truncate mb-4">{currentTrack.artist}</p>
          
          {/* Fixed Visualizer Container */}
          <div className="h-6 flex items-end justify-center space-x-1 mb-2">
            {isPlaying ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-end justify-center space-x-1"
              >
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full equalizer-bar"
                  />
                ))}
              </motion.div>
            ) : (
              <div className="flex items-end justify-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 h-1 bg-white/20 rounded-full"
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="w-full h-2 bg-white/20 rounded-full cursor-pointer mb-2 relative"
          >
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-300">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls - Removed Stop Button */}
        <div className="flex items-center justify-center space-x-6 mb-6">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleShuffle}
            className={`p-2 rounded-full ${isShuffled ? 'bg-purple-500' : 'bg-white/20'} text-white`}
          >
            <Shuffle className="w-5 h-5" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handlePrevious}
            className="p-3 bg-white/20 rounded-full text-white"
          >
            <SkipBack className="w-6 h-6" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handlePlay}
            className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white"
          >
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleNext}
            className="p-3 bg-white/20 rounded-full text-white"
          >
            <SkipForward className="w-6 h-6" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleRepeat}
            className={`p-2 rounded-full ${repeatMode !== 'none' ? 'bg-purple-500' : 'bg-white/20'} text-white relative`}
          >
            <Repeat className="w-5 h-5" />
            {repeatMode === 'one' && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full text-xs flex items-center justify-center">1</span>
            )}
          </motion.button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-3 mb-6">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleMute}
            className="text-white"
          >
            {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </motion.button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Playlist Toggle */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowPlaylist(!showPlaylist)}
          className="w-full py-3 bg-white/10 rounded-xl text-white font-medium"
        >
          {showPlaylist ? 'Hide Playlist' : 'Show Playlist'}
        </motion.button>

        {/* Playlist */}
        <AnimatePresence>
          {showPlaylist && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-2 max-h-60 overflow-y-auto"
            >
              {TRACKS.map((track) => (
                <motion.button
                  key={track.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => selectTrack(track)}
                  className={`w-full p-3 rounded-xl text-left ${
                    currentTrack.id === track.id 
                      ? 'bg-purple-500/30 border border-purple-500/50' 
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="text-white font-medium truncate">{track.title}</div>
                  <div className="text-gray-300 text-sm truncate">{track.artist}</div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Equalizer Animation - Removed from bottom */}

        {/* Audio Element */}
        <audio
          ref={audioRef}
          src={`/musicol/${encodeURIComponent(currentTrack.filename)}`}
          preload="metadata"
          controls={false}
          crossOrigin="anonymous"
        />
      </motion.div>
    </div>
  )
}