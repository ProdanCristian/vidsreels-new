"use client"

import { useState, useRef, useEffect } from 'react'
import { toast } from "sonner"
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import DashboardHeader from '@/components/dashboard-header'
import { Crown, Sparkles, Volume2, Mic, Check, Music, Play, Pause, Search, Edit3, Save, X, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import YouTube from 'react-youtube'

interface FamousPerson {
  id: string
  name: string
  description: string
  voiceModelId: string
  avatar: string
  image?: string
  category: string
  style: string
}

interface MusicTrack {
  id: string
  title: string
  artist: string
  thumbnail: string
  duration: string
  url: string
}

interface YoutubePlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  stopVideo: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
}

interface YouTubePlayerError {
  data: number;
}

export default function LuxuryScriptGenerator() {
  // Core states
  const [selectedPerson, setSelectedPerson] = useState<FamousPerson | null>(null)
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [customScript, setCustomScript] = useState('')
  const [useCustomScript, setUseCustomScript] = useState(false)
  const [isOptimizingScript, setIsOptimizingScript] = useState(false)
  const [isEditingScript, setIsEditingScript] = useState(false)
  const [duration, setDuration] = useState('medium')
  const [generatedScript, setGeneratedScript] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Voice generation states
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [voiceSpeed, setVoiceSpeed] = useState(1.0) // Default normal speed
  const [temperature, setTemperature] = useState(0.9) // Voice creativity
  const [topP, setTopP] = useState(0.9) // Voice diversity

  // Music recommendation states
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([])
  const [isLoadingMusic, setIsLoadingMusic] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [playerKey, setPlayerKey] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [trackDuration, setTrackDuration] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [initTimeout, setInitTimeout] = useState<NodeJS.Timeout | null>(null)
  // const [retryCount, setRetryCount] = useState(0) // Removed - not used in current implementation

  const audioRef = useRef<HTMLAudioElement>(null)
  const youtubePlayerRef = useRef<YoutubePlayer | null>(null)

  // Update timeline progress
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isPlaying && youtubePlayerRef.current && playingVideoId && !isSeeking && isPlayerReady) {
      interval = setInterval(() => {
        try {
          if (youtubePlayerRef.current && !isSeeking && typeof youtubePlayerRef.current.getCurrentTime === 'function') {
            const current = youtubePlayerRef.current.getCurrentTime()
            const total = youtubePlayerRef.current.getDuration()
            
            if (current !== undefined && current !== null && !isNaN(current)) {
              setCurrentTime(current)
            }
            if (total !== undefined && total !== null && total > 0 && !isNaN(total)) {
              setTrackDuration(total)
            }
          }
        } catch (error) {
          console.log('🎵 Error updating timeline:', error)
        }
      }, 250)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isPlaying, playingVideoId, isSeeking, isPlayerReady])

  // Format time for display
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Handle timeline seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value)
    setCurrentTime(seekTime)
  }

  const handleSeekStart = () => {
    setIsSeeking(true)
  }

  const handleSeekEnd = (e: React.MouseEvent<HTMLInputElement>) => {
    setIsSeeking(false)
    const seekTime = parseFloat(e.currentTarget.value)
        
    if (youtubePlayerRef.current && playingVideoId && isPlayerReady) {
      try {
        if (typeof youtubePlayerRef.current.seekTo === 'function') {
          youtubePlayerRef.current.seekTo(seekTime, true)
        }
      } catch (error) {
        console.error('🎵 Error seeking:', error)
      }
    }
  }

  // Extract YouTube video ID from URL (handles both YouTube and YouTube Music)
  const extractVideoId = (url: string): string | null => {
    if (!url || typeof url !== 'string') {
      console.log('🎵 Invalid URL provided:', url)
      return null
    }

    // Updated patterns to specifically handle YouTube Music URLs
    const patterns = [
      /(?:music\.youtube\.com\/watch\?v=)([^&\n?#]+)/, // YouTube Music - priority pattern
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/, // Regular YouTube
      /(?:youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/ // Embed URLs
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        const videoId = match[1].trim()
        // Basic validation - YouTube video IDs are typically 11 characters
        if (videoId.length >= 10 && videoId.length <= 12) {
          console.log('🎵 Extracted video ID:', videoId, 'from YouTube Music URL:', url)
          return videoId
        }
      }
    }
    
    console.log('🎵 Could not extract valid video ID from YouTube Music URL:', url)
    return null
  }

  // Search for music
  const searchMusic = async (query: string = 'motivational workout gym music') => {
    console.log('🎵 Starting music search for:', query)
    setIsLoadingMusic(true)
    try {
      const response = await fetch(`/api/music-recommendations?query=${encodeURIComponent(query)}&limit=12`)
      console.log('🎵 Response status:', response.status, response.ok)
      
      if (!response.ok) throw new Error('Failed to fetch music')
      
      const data = await response.json()
      console.log('🎵 Music API Response:', data)
      
      // Transform the API response to match our interface
      const tracks: MusicTrack[] = data.videos?.map((track: { 
        id?: string; 
        name?: string; 
        url?: string; 
        thumbnail?: string; 
        duration?: string;
        views?: number;
        artist?: string;
      }, index: number) => ({
        id: track.id || `track-${index}`,
        title: track.name || 'Unknown Title',
        artist: track.artist || 'Unknown Artist',
        thumbnail: track.thumbnail || '/video-placeholder.png',
        duration: track.duration || '0:00',
        url: track.url || '#'
      })) || []
      
      setMusicTracks(tracks)
    } catch (error) {
      console.error('🎵 Error searching music:', error)
      toast.error('Failed to search music')
    } finally {
      setIsLoadingMusic(false)
    }
  }

  // Load standard music recommendations on component mount
  const loadStandardMusic = async () => {
    await searchMusic('motivational workout gym music')
  }

  // Retry playing current track
  const retryPlayTrack = () => {
    if (selectedTrack) {
      console.log('🎵 Retrying track:', selectedTrack.title)
      
      if (youtubePlayerRef.current) {
        try {
          youtubePlayerRef.current.playVideo()
          setPlayerError(null)
          return
        } catch (e) {
          console.log('🎵 Existing player retry failed:', e)
        }
      }
      
      toast.info('Reloading track...')
      playTrack(selectedTrack)
    } else {
      toast.error('No track selected to retry.')
    }
  }

  // Play a specific track
  const playTrack = (track: MusicTrack) => {
    if (!track || !track.url) {
      console.log('🎵 Invalid track provided:', track)
      toast.error('Invalid track selected')
      return
    }

    const videoId = extractVideoId(track.url)
    console.log('🎵 playTrack called:', track.title, 'VideoID:', videoId, 'URL:', track.url)
    
    if (!videoId) {
      toast.error(`Unable to play "${track.title}" - invalid video URL`)
      return
    }

    // Additional validation for YouTube video ID format
    if (!/^[a-zA-Z0-9_-]{10,12}$/.test(videoId)) {
      console.log('🎵 Invalid video ID format:', videoId)
      toast.error(`Unable to play "${track.title}" - invalid video format`)
      return
    }

    if (playingVideoId === videoId) {
      if (youtubePlayerRef.current) {
        if (isPlaying) {
          youtubePlayerRef.current.pauseVideo();
        } else {
          youtubePlayerRef.current.playVideo();
        }
      }
      return;
    }

    // Stop current player if it exists
    if (youtubePlayerRef.current) {
      try {
        youtubePlayerRef.current.stopVideo()
      } catch (e) {
        console.log('🎵 Could not stop current video:', e)
      }
    }

    // Force new player creation with incremented key
    setPlayerKey(prev => prev + 1)
    
    // Reset timeline state and errors
    setCurrentTime(0)
    setTrackDuration(0)
    setPlayerError(null)
    setIsPlayerReady(false)
    // setRetryCount(0) // Reset retry count for new track - variable removed
    youtubePlayerRef.current = null
    
    setSelectedTrack(track)
    setPlayingVideoId(videoId)
    setIsPlaying(false) // Don't assume playing until user interaction on mobile
    
    // Set a timeout to detect if player fails to initialize
    const timeout = setTimeout(() => {
      if (!isPlayerReady) {
        console.log('🎵 Player initialization timeout - player failed to load')
        setPlayerError('Player failed to initialize')
        setIsPlaying(false)
        toast.error('Track failed to load. Please try another one.')
      }
    }, 5000) // 5 seconds should be enough for most tracks to load
    
    setInitTimeout(timeout)
  }

  // Famous people data
  const famousPeople: FamousPerson[] = [
    {
      id: 'andrew-tate',
      name: 'Andrew Tate',
      description: 'Bold, direct, alpha mindset entrepreneur',
      voiceModelId: 'f4bb786f17114f20a9796d0d85eeadbc',
      avatar: 'AT',
      image: '/influencers/Andrew Tate.webp',
      category: 'Entrepreneur',
      style: 'Direct, confident, success-focused'
    },
    {
      id: 'donald-trump',
      name: 'Donald Trump',
      description: 'Commanding, business-focused leadership',
      voiceModelId: '781ce8d36f5d44058a50e9c37e430855',
      avatar: 'DT',
      image: '/influencers/Donald trump.webp',
      category: 'Business',
      style: 'Tremendous, winning, deal-making'
    },
    {
      id: 'elon-musk',
      name: 'Elon Musk',
      description: 'Visionary entrepreneur and innovator',
      voiceModelId: '03397b4c4be74759b72533b663fbd001',
      avatar: 'EM',
      image: '/influencers/Elon musk.webp',
      category: 'Tech',
      style: 'Innovative, ambitious, future-focused'
    },
    {
      id: 'david-goggins',
      name: 'David Goggins',
      image: '/influencers/David Goggins.webp',
      description: 'Raw, intense mental toughness',
      voiceModelId: 'ff5468d06c2443dba9b8d2f9c6aa26b0',
      avatar: 'DG',
      category: 'Motivation',
      style: 'No excuses, extreme discipline'
    },
    {
      id: 'bruce-lee',
      name: 'Bruce Lee',
      image: '/influencers/Bruce Lee.webp',
      description: 'Martial arts icon & philosopher',
      voiceModelId: '0a0f2721064c4bb4be7d9ec63ee605e6',
      avatar: 'BL',
      category: 'Motivation',
      style: 'Philosophical, disciplined, powerful'
    },
    {
      id: 'tony-robbins',
      name: 'Tony Robbins',
      image: '/influencers/Tony Robbins.webp',
      description: 'Transformational life coaching',
      voiceModelId: '77235677dc574ae7b1165c6d5d27bd4e',
      avatar: 'TR',
      category: 'Life Coach',
      style: 'Empowering, breakthrough-focused'
    },
    {
      id: 'gary-vee',
      name: 'Gary Vaynerchuk',
      image: '/influencers/Gary Veynerchuk.webp',
      description: 'Fast-paced business expertise',
      voiceModelId: '26750f282e39421aac56e4954732aefa',
      avatar: 'GV',
      category: 'Business',
      style: 'Energetic, practical, authentic'
    },
    {
      id: 'jordan-peterson',
      name: 'Jordan Peterson',
      image: '/influencers/Jordan Peterson.webp',
      description: 'Intellectual, psychological insights',
      voiceModelId: '6cc64fd3bc0d44fc97c7d31110d7c622',
      avatar: 'JP',
      category: 'Psychology',
      style: 'Thoughtful, analytical, profound'
    }
  ]

  // Create personalized prompt based on selected person
  const createPersonalizedPrompt = (person: FamousPerson, userPrompt: string, duration: string) => {
    // Convert duration labels to appropriate lengths
    const durationMap = {
      'short': { display: 'short (30-60 seconds)', words: 100, seconds: 45 },
      'medium': { display: 'medium (1-2 minutes)', words: 200, seconds: 90 },
      'long': { display: 'long (2-3 minutes)', words: 350, seconds: 150 }
    }
    
    const durationInfo = durationMap[duration as keyof typeof durationMap] || durationMap.medium
    const durationDisplay = durationInfo.display
    const wordCount = durationInfo.words

    let basePrompt = `Create a powerful motivational ${durationDisplay} script in the style of ${person.name}.

🎯 CHARACTER: ${person.name}
📝 STYLE: ${person.style}
📈 TONE: ${person.description}
⏰ LENGTH: ${durationDisplay} (~${wordCount} words)
📊 PACING: Adapt to ${person.name}'s natural speaking rhythm and style

FISH AUDIO VOICE TAGS:
🎭 Use emotion tags at sentence start: (excited), (confident), (serious)
🗣️ Add natural speech elements: "um", "uh", (break), (breath)
📝 Keep tags minimal and natural - avoid overuse

CRITICAL REQUIREMENTS:
- PURE SPEECH ONLY - no narrator labels or stage directions
- Direct motivational address as if ${person.name} is speaking to the listener
- Include ${person.name}'s signature phrases and speaking patterns
- Use Fish Audio tags SPARINGLY - only 2-3 emotion tags per script
- Place emotion tags at sentence beginnings: (excited)This is incredible!
- Add natural pauses with (break) or "um" occasionally
- Focus on motivation, success, and personal growth
- Make it powerful and inspiring

${person.name.toUpperCase()} STYLE CHARACTERISTICS:`

    // Add person-specific style guidance
    switch (person.id) {
      case 'andrew-tate':
        basePrompt += `
- Direct, no-nonsense approach: "Listen, here's the reality..."
- Challenge weakness: "While they make excuses, champions make moves"
- Alpha mindset: "Winners don't ask permission"
- Success focus: "Money is just a scorecard"`
        break
      case 'donald-trump':
        basePrompt += `
- Tremendous emphasis: "We're doing tremendous things, believe me"
- Winning focus: "We're going to win so much, you'll get tired of winning"
- Deal-making: "I make the best deals, the absolute best"
- Confidence: "Nobody knows [topic] better than me"`
        break
      case 'david-goggins':
        basePrompt += `
- Raw intensity: "You think you know hard? You don't know hard"
- Mental toughness: "Your mind is everything. Control it or it controls you"
- No excuses: "Stop looking for the easy way out"
- Embrace suffering: "Pain is weakness leaving the body"`
        break
      case 'bruce-lee':
        basePrompt += `
- Philosophical water analogies: "Be like water, my friend."
- Simplicity and directness: "Simplicity is the key to brilliance."
- Self-knowledge: "All knowledge ultimately means self-knowledge."
- Limitless potential: "If you always put limit on everything you do, physical or anything else. It will spread into your work and into your life. There are no limits. There are only plateaus, and you must not stay there, you must go beyond them."`
        break
      case 'elon-musk':
        basePrompt += `
- Visionary thinking: "The future is going to be wild"
- Technical ambition: "We need to become a multiplanetary species"
- Innovation focus: "The best part is no part, the best process is no process"
- Bold predictions: "This will change everything"`
        break
      case 'tony-robbins':
        basePrompt += `
- Empowering questions: "What if I told you that your greatest fear..."
- Massive action: "The quality of your life is the quality of your relationships"
- Breakthrough focus: "Progress equals happiness"
- Energy and passion: "Energy is life's most precious resource"`
        break
      case 'gary-vee':
        basePrompt += `
- Direct business advice: "Look, here's the thing nobody's telling you..."
- Hustle mentality: "While you're overthinking, someone else is executing"
- Practical approach: "Stop reading, start doing"
- Authentic energy: "You know what I mean?"`
        break
      case 'jordan-peterson':
        basePrompt += `
- Intellectual depth: "There's something profound about the human condition..."
- Personal responsibility: "Clean up your life, start with your room"
- Psychological insight: "We become what we pay attention to"
- Archetypal references: "This is an ancient truth that modern people have forgotten"`
        break
      default:
        basePrompt += `
- Stay true to their unique speaking style and philosophy
- Use their characteristic phrases and mindset
- Focus on their core message and approach`
    }

    if (userPrompt.trim()) {
      basePrompt += `\n\nADDITIONAL USER GUIDANCE:\n${userPrompt.trim()}`
    }

    basePrompt += `\n\nGenerate ONE powerful ${durationDisplay} motivational script that sounds exactly like ${person.name} speaking directly to the listener.`

    return basePrompt
  }


  // Generate script only
  const handleGenerateScript = async () => {
    if (!selectedPerson) {
      toast.error('Please select a famous person first!')
      return
    }

    setIsGenerating(true)
    setGeneratedScript('')
    setAudioUrl(null)

    try {
      const scriptPrompt = createPersonalizedPrompt(selectedPerson, customPrompt, duration)
      
      const scriptResponse = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: scriptPrompt })
      })

      if (!scriptResponse.ok) throw new Error('Failed to generate script')
      
      const scriptData = await scriptResponse.json()
      const script = scriptData.scripts?.[0] || scriptData.script
      
      if (!script) throw new Error('No script generated')
      
      setGeneratedScript(script)
      toast.success('Script generated successfully!')

    } catch (error) {
      console.error('Error generating script:', error)
      toast.error('Failed to generate script. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Optimize custom script for voice generation
  const handleOptimizeScript = async () => {
    if (!selectedPerson) {
      toast.error('Please select a famous person first!')
      return
    }

    if (!customScript.trim()) {
      toast.error('Please enter a custom script first!')
      return
    }

    setIsOptimizingScript(true)

    try {
      const optimizationPrompt = `Optimize this script for AI voice generation in the style of ${selectedPerson.name}.

Original Script:
${customScript.trim()}

FISH AUDIO VOICE OPTIMIZATION:
🎭 Add emotion tags at sentence beginnings: (excited), (confident), (serious)
🗣️ Include natural speech: "um", "uh", (break), (breath) sparingly
📝 Maintain ${selectedPerson.name}'s speaking style: ${selectedPerson.style}
⚠️ Use tags minimally - focus on natural speech flow

RETURN REQUIREMENTS:
- Keep the same message and meaning
- Add 2-3 emotion tags at sentence beginnings: (excited), (confident), (serious)
- Include 1-2 natural pauses: (break) or "um", "uh"
- Enhance with ${selectedPerson.name}'s characteristic phrases and patterns
- Make it sound natural when spoken aloud
- Optimize pacing and flow for voice generation

IMPORTANT: Use tags minimally. Too many tags will interfere with voice quality.

Return ONLY the optimized script, ready for voice generation.`
      
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: optimizationPrompt })
      })

      if (!response.ok) throw new Error('Failed to optimize script')
      
      const data = await response.json()
      const optimizedScript = data.scripts?.[0] || data.script
      
      if (!optimizedScript) throw new Error('No optimized script received')
      
      setCustomScript(optimizedScript)
      toast.success('Script optimized for voice generation!')

    } catch (error) {
      console.error('Error optimizing script:', error)
      toast.error('Failed to optimize script. Please try again.')
    } finally {
      setIsOptimizingScript(false)
    }
  }

  // Handle voice generation (simplified for single script)
  const handleGenerateVoice = async () => {
    if (!generatedScript) {
      toast.error('Please generate a script first!')
      return
    }

    if (!selectedPerson?.voiceModelId) {
      toast.error('Voice model not available for this person')
      return
    }

    setIsGeneratingVoice(true)
    
    try {
      const response = await fetch('/api/generate-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: generatedScript,
          reference_id: selectedPerson.voiceModelId,
          speed: voiceSpeed,
          temperature: temperature,
          top_p: topP
        })
      })

      if (!response.ok) throw new Error('Failed to generate voice')

      const audioBlob = await response.blob()
      const url = URL.createObjectURL(audioBlob)
      setAudioUrl(url)
      toast.success('Voice generated successfully!')
      
      // Load music after voice generation
      await loadStandardMusic()
      
    } catch (error) {
      console.error('Error generating voice:', error)
      toast.error('Failed to generate voice. Please try again.')
    } finally {
      setIsGeneratingVoice(false)
    }
  }

  // Get person's gradient color
  const getPersonGradient = (category: string) => {
    const gradients = {
      'Entrepreneur': 'from-red-500 to-orange-600',
      'Business': 'from-blue-500 to-indigo-600', 
      'Tech': 'from-violet-500 to-purple-600',
      'Motivation': 'from-green-500 to-emerald-600',
      'Life Coach': 'from-purple-500 to-pink-600',
      'Psychology': 'from-cyan-500 to-blue-600'
    }
    return gradients[category as keyof typeof gradients] || 'from-gray-500 to-gray-600'
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 sm:pt-24">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Crown className="w-8 h-8 md:w-12 md:h-12 text-white mr-3" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              AI Luxury Reels Generation
            </h1>
          </div>
          <p className="text-sm text-white/70 mb-1 max-w-2xl mx-auto">
            Select a famous person, get their motivational voice and script and generate reels instantly
          </p>
        </div>

        {/* Famous Person Selection - Trigger Button */}
        <div className="bg-black/30 backdrop-blur-md border border-white/20 shadow-2xl mb-6 sm:mb-8 rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="w-7 h-7 bg-white/10 text-white/60 rounded-full flex items-center justify-center text-xs font-medium border border-white/20">
                1
              </div>
              <span className="text-white font-medium text-base">Choose Your Famous Person</span>
            </div>
            
            {selectedPerson ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white font-bold text-xl ring-1 ring-white/20">
                    {selectedPerson.image ? (
                      <Image
                        src={selectedPerson.image}
                        alt={selectedPerson.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${getPersonGradient(selectedPerson.category)} rounded-full flex items-center justify-center`}>
                        {selectedPerson.avatar}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-lg mb-1">{selectedPerson.name}</h3>
                    <p className="text-xs text-white/60 mb-1">{selectedPerson.category}</p>
                    <p className="text-xs text-white/80">{selectedPerson.description}</p>
                  </div>
                </div>
                <Dialog open={isPersonModalOpen} onOpenChange={setIsPersonModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-white/20 hover:bg-white/30 border border-white/30 text-white">
                      Change Person
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-black/95 backdrop-blur-md border border-white/20 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-white text-xl font-bold flex items-center gap-2">
                        <Crown className="w-6 h-6" />
                        Choose Your Famous Person
                      </DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 mt-4">
                      {famousPeople.map((person) => (
                        <div
                          key={person.id}
                          onClick={() => {
                            setSelectedPerson(person)
                            setIsPersonModalOpen(false)
                          }}
                          className={`relative p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                            selectedPerson?.id === person.id
                              ? 'bg-white/20 border-white/40 ring-2 ring-white/30'
                              : 'bg-black/30 border-white/10 hover:border-white/30 hover:bg-white/10'
                          }`}
                        >
                          {/* Avatar */}
                          <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white font-bold text-xl mb-3 mx-auto ring-1 ring-white/20 hover:ring-white/40 shadow-lg transition-all duration-300 group-hover:scale-105">
                            {person.image ? (
                              <Image
                                src={person.image}
                                alt={person.name}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-br ${getPersonGradient(person.category)} rounded-full flex items-center justify-center`}>
                                {person.avatar}
                              </div>
                            )}
                          </div>
                          
                          {/* Person Info */}
                          <div className="text-center">
                            <h3 className="font-semibold text-white text-lg mb-1">{person.name}</h3>
                            <p className="text-xs text-white/60 mb-2">{person.category}</p>
                            <p className="text-xs text-white/80 mb-3 line-clamp-2">{person.description}</p>
                            
                            {/* Voice Status */}
                            <div className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md ${
                              person.voiceModelId 
                                ? 'bg-green-500/20 text-green-300' 
                                : 'bg-yellow-500/20 text-yellow-300'
                            }`}>
                              <Mic className="w-3 h-3" />
                              {person.voiceModelId ? 'Voice Available' : 'Voice Coming Soon'}
                            </div>
                          </div>

                          {/* Selected Indicator */}
                          {selectedPerson?.id === person.id && (
                            <div className="absolute top-2 right-2">
                              <Check className="w-5 h-5 text-green-400" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <Dialog open={isPersonModalOpen} onOpenChange={setIsPersonModalOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-white/20 hover:bg-white/30 border border-white/30 text-white py-8 text-lg">
                    <Crown className="w-6 h-6 mr-2" />
                    Select Famous Person
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-black/95 backdrop-blur-md border border-white/20 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-white text-xl font-bold flex items-center gap-2">
                      <Crown className="w-6 h-6" />
                      Choose Your Famous Person
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 mt-4">
                    {famousPeople.map((person) => (
                      <div
                        key={person.id}
                        onClick={() => {
                          setSelectedPerson(person)
                          setIsPersonModalOpen(false)
                        }}
                        className="relative p-4 rounded-xl border cursor-pointer transition-all duration-200 bg-black/30 border-white/10 hover:border-white/30 hover:bg-white/10"
                      >
                        {/* Avatar */}
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white font-bold text-xl mb-3 mx-auto ring-1 ring-white/20 hover:ring-white/40 shadow-lg transition-all duration-300 group-hover:scale-105">
                          {person.image ? (
                            <Image
                              src={person.image}
                              alt={person.name}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${getPersonGradient(person.category)} rounded-full flex items-center justify-center`}>
                              {person.avatar}
                            </div>
                          )}
                        </div>
                        
                        {/* Person Info */}
                        <div className="text-center">
                          <h3 className="font-semibold text-white text-lg mb-1">{person.name}</h3>
                          <p className="text-xs text-white/60 mb-2">{person.category}</p>
                          <p className="text-xs text-white/80 mb-3 line-clamp-2">{person.description}</p>
                          
                          {/* Voice Status */}
                          <div className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md ${
                            person.voiceModelId 
                              ? 'bg-green-500/20 text-green-300' 
                              : 'bg-yellow-500/20 text-yellow-300'
                          }`}>
                            <Mic className="w-3 h-3" />
                            {person.voiceModelId ? 'Voice Available' : 'Voice Coming Soon'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Configuration & Generation */}
        {selectedPerson && (
          <div className="bg-black/30 backdrop-blur-md border border-white/20 shadow-2xl mb-8 rounded-2xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-white flex items-center gap-3 text-base font-medium mb-4">
                <div className="w-7 h-7 bg-white/10 text-white/60 rounded-full flex items-center justify-center text-xs font-medium border border-white/20">
                  2
                </div>
                <span>Create Your Script</span>
              </h3>
              <p className="text-white/60 text-sm mt-2">
                {selectedPerson.style} • {duration.charAt(0).toUpperCase() + duration.slice(1)} length
              </p>
            </div>
            <div className="px-6 pb-6">
              <div className="grid gap-6">
                {/* Script Generation Option Toggle */}
                <div className="grid gap-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setUseCustomScript(false)}
                      className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all duration-200 ${!useCustomScript ? 'bg-white/20 border-white/40 text-white' : 'bg-black/30 border-white/20 text-white/70 hover:bg-white/10 hover:border-white/30'}`}
                    >
                      Generate AI Script
                    </button>
                    <button
                      onClick={() => setUseCustomScript(true)}
                      className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all duration-200 ${useCustomScript ? 'bg-white/20 border-white/40 text-white' : 'bg-black/30 border-white/20 text-white/70 hover:bg-white/10 hover:border-white/30'}`}
                    >
                      Use Custom Script
                    </button>
                  </div>
                  
                  {useCustomScript ? (
                    <div className="grid gap-3">
                      <Label htmlFor="custom-script" className="text-white/90">Your Custom Script</Label>
                      <Textarea
                        id="custom-script"
                        value={customScript}
                        onChange={(e) => {
                          const newScript = e.target.value
                          const maxChars = 2000 // Character limit for voice generation
                          if (newScript.length <= maxChars) {
                            setCustomScript(newScript)
                          }
                        }}
                        placeholder="Enter your custom script here. This will be used directly for voice generation."
                        className="bg-black/50 border border-white/20 text-white rounded-xl px-4 py-3 min-h-[150px] focus:border-white/40 focus:outline-none transition-all duration-200 resize-none"
                      />
                      <div className="flex items-center justify-between text-xs">
                        <div className={`${
                          customScript.length > 1800 ? 'text-yellow-400' : 
                          customScript.length > 1900 ? 'text-red-400' : 'text-white/60'
                        }`}>
                          {customScript.length}/2000 characters
                        </div>
                        <div className="text-white/50">
                          {customScript.length > 1800 && customScript.length <= 1900 && '⚠️ Approaching limit'}
                          {customScript.length > 1900 && '🚫 Near maximum'}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-white/50">
                          Paste or type your own script (max 2000 chars)
                        </p>
                        <Button
                          onClick={handleOptimizeScript}
                          disabled={isOptimizingScript || !customScript.trim() || !selectedPerson}
                          size="sm"
                          className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-xs px-3 py-1"
                        >
                          {isOptimizingScript ? (
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 border border-purple-300/30 border-t-purple-300 rounded-full animate-spin"></div>
                              Optimizing...
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Optimize Script
                            </div>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-purple-300/70 mt-1">
                        💡 Click `Optimize Script` to add voice tags and enhance your script for better AI voice generation
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      <Label htmlFor="custom-prompt" className="text-white/90">Additional Instructions (Optional)</Label>
                      <Textarea
                        id="custom-prompt"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder={`e.g., "Talk about overcoming failure", "Focus on building wealth", "Make it about taking action today", "Include personal responsibility"...`}
                        className="bg-black/50 border border-white/20 text-white rounded-xl px-4 py-3 min-h-[100px] focus:border-white/40 focus:outline-none transition-all duration-200 resize-none"
                      />
                      <p className="text-xs text-white/50">
                        Add specific guidance to customize {selectedPerson.name}&apos;s message
                      </p>
                    </div>
                  )}
                </div>

                {/* Duration Selection - Only show when generating AI script */}
                {!useCustomScript && (
                  <div className="grid gap-3">
                    <Label htmlFor="duration" className="text-white/90">Content Length</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'short', label: 'Short', icon: '⚡' },
                        { value: 'medium', label: 'Medium', icon: '🎯' },
                        { value: 'long', label: 'Long', icon: '📖' }
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setDuration(option.value)}
                          className={`p-3 rounded-xl border text-sm font-medium transition-all duration-200 ${
                            duration === option.value
                              ? 'bg-white/20 border-white/40 text-white'
                              : 'bg-black/30 border-white/20 text-white/70 hover:bg-white/10 hover:border-white/30'
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <div className="text-lg">{option.icon}</div>
                            <div className="font-semibold">{option.label}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-white/50 text-center">
                      Choose your preferred content length - actual duration may vary by person&apos;s speaking style
                    </p>
                  </div>
                )}


                {/* Generate/Use Script Button */}
                {useCustomScript ? (
                  <Button 
                    onClick={() => {
                      if (!customScript.trim()) {
                        toast.error('Please enter a custom script first!')
                        return
                      }
                      setGeneratedScript(customScript.trim())
                      toast.success('Custom script loaded successfully!')
                    }}
                    disabled={!selectedPerson || !customScript.trim()}
                    className="w-full bg-white/20 hover:bg-white/30 border border-white/30 hover:border-white/50 text-white font-medium py-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Use Custom Script
                  </Button>
                ) : (
                  <Button 
                    onClick={handleGenerateScript} 
                    disabled={isGenerating || !selectedPerson}
                    className="w-full bg-white/20 hover:bg-white/30 border border-white/30 hover:border-white/50 text-white font-medium py-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Generating {selectedPerson.name} Script...
                      </div>
                    ) : (
                      `Generate ${selectedPerson.name} Script`
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Generated Script Display */}
        {generatedScript && (
          <div className="bg-black/30 backdrop-blur-md border border-white/20 shadow-2xl mb-8 rounded-2xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-white flex items-center gap-3 text-base font-medium mb-4">
                <div className="w-7 h-7 bg-white/20 text-white rounded-full flex items-center justify-center text-xs font-medium border border-white/30">
                  ✓
                </div>
                <span>Your Script</span>
                {!isEditingScript && (
                  <Button
                    onClick={() => setIsEditingScript(true)}
                    size="sm"
                    className="ml-auto bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-300 text-xs px-3 py-1"
                  >
                    <Edit3 className="w-3 h-3 mr-1" />
                    Edit Script
                  </Button>
                )}
              </h3>
            </div>
            <div className="px-6 pb-6">
              {isEditingScript ? (
                <div className="space-y-4">
                  <Textarea
                    value={generatedScript}
                    onChange={(e) => {
                      const newScript = e.target.value
                      const maxChars = 2000 // Character limit for voice generation
                      if (newScript.length <= maxChars) {
                        setGeneratedScript(newScript)
                      }
                    }}
                    className="bg-black/50 border border-white/20 text-white rounded-xl px-4 py-3 min-h-[200px] focus:border-white/40 focus:outline-none transition-all duration-200 resize-none font-mono text-sm"
                    placeholder="Edit your script here..."
                  />
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/60">
                      {generatedScript.length}/2000 characters
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setIsEditingScript(false)}
                        size="sm"
                        className="bg-gray-500/20 hover:bg-gray-500/30 border border-gray-500/30 text-gray-300 text-xs px-3 py-1"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          setIsEditingScript(false)
                          toast.success('Script updated successfully!')
                        }}
                        size="sm"
                        className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-300 text-xs px-3 py-1"
                      >
                        <Save className="w-3 h-3 mr-1" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-black/50 border border-white/10 p-6 rounded-xl">
                  <pre className="whitespace-pre-wrap text-white/90 font-mono text-sm leading-relaxed">
                    {generatedScript}
                  </pre>
                  <div className="mt-4 pt-4 border-t border-white/10 text-xs text-white/50">
                    {generatedScript.length} characters
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Voice Generation Section - Only show after script is ready */}
        {generatedScript && (
          <div className="bg-black/30 backdrop-blur-md border border-white/20 shadow-2xl mb-8 rounded-2xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-white flex items-center gap-3 text-base font-medium mb-4">
                <div className="w-7 h-7 bg-white/10 text-white/60 rounded-full flex items-center justify-center text-xs font-medium border border-white/20">
                  3
                </div>
                <span>Generate {selectedPerson?.name} Voice</span>
              </h3>
              <div className="mt-3 p-4 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-sm text-white/70 flex items-start gap-2">
                  <span className="text-lg">💡</span>
                  <span>
                    <strong>Voice Generation:</strong> Convert your script to {selectedPerson?.name}&apos;s voice using advanced AI. 
                    You can adjust voice settings and regenerate as needed. The AI voice isn&apos;t always perfect on the first try - 
                    adjust the voice settings above (speed, creativity, diversity) and regenerate to get better results!
                  </span>
                </p>
              </div>
              {!selectedPerson?.voiceModelId && (
                <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-lg">
                  <p className="text-sm text-white/60 flex items-start gap-2">
                    <span className="text-lg">⚠️</span>
                    <span>
                      <strong>Voice Model Unavailable:</strong> Voice generation is not available for {selectedPerson?.name} yet.
                    </span>
                  </p>
                </div>
              )}
            </div>
            <div className="px-6 pb-6">
              <div className="space-y-6">
                {/* Voice Controls - Only show if voice model is available */}
                {selectedPerson?.voiceModelId && (
                  <>
                    {/* Voice Speed Control */}
                    <div className="grid gap-3">
                      <Label className="text-white/90">Voice Speed</Label>
                      <div className="space-y-3">
                        {/* Speed Preset Buttons */}
                        <div className="grid grid-cols-5 gap-2">
                          {[
                            { value: 0.5, label: '0.5x', desc: 'Very Slow' },
                            { value: 0.75, label: '0.75x', desc: 'Slow' },
                            { value: 1.0, label: '1.0x', desc: 'Normal' },
                            { value: 1.25, label: '1.25x', desc: 'Fast' },
                            { value: 1.5, label: '1.5x', desc: 'Very Fast' }
                          ].map((preset) => (
                            <button
                              key={preset.value}
                              onClick={() => setVoiceSpeed(preset.value)}
                              className={`p-2 rounded-lg border text-xs font-medium transition-all duration-200 ${
                                voiceSpeed === preset.value
                                  ? 'bg-white/20 border-white/40 text-white'
                                  : 'bg-black/30 border-white/20 text-white/70 hover:bg-white/10 hover:border-white/30'
                              }`}
                            >
                              <div className="font-semibold">{preset.label}</div>
                              <div className="text-[10px] text-white/60">{preset.desc}</div>
                            </button>
                          ))}
                        </div>

                        {/* Fine-tune Slider */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-white/70">
                            <span>Fine-tune:</span>
                            <span>{voiceSpeed.toFixed(2)}x</span>
                          </div>
                          <input
                            type="range"
                            min="0.25"
                            max="2.0"
                            step="0.05"
                            value={voiceSpeed}
                            onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                            className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer slider-thumb"
                            style={{
                              background: `linear-gradient(to right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.3) ${((voiceSpeed - 0.25) / (2.0 - 0.25)) * 100}%, rgba(0,0,0,0.3) ${((voiceSpeed - 0.25) / (2.0 - 0.25)) * 100}%, rgba(0,0,0,0.3) 100%)`
                            }}
                          />
                          <div className="flex justify-between text-[10px] text-white/50">
                            <span>0.25x</span>
                            <span>1.0x</span>
                            <span>2.0x</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Advanced Voice Quality Controls */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Temperature Control */}
                      <div className="grid gap-3">
                        <Label className="text-white/90">Voice Creativity (Temperature)</Label>
                        <div className="space-y-3">
                          {/* Temperature Presets */}
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { value: 0.3, label: 'Conservative', desc: 'Predictable' },
                              { value: 0.7, label: 'Balanced', desc: 'Standard' },
                              { value: 0.9, label: 'Creative', desc: 'Default' }
                            ].map((preset) => (
                              <button
                                key={preset.value}
                                onClick={() => setTemperature(preset.value)}
                                className={`p-2 rounded-lg border text-xs font-medium transition-all duration-200 ${
                                  Math.abs(temperature - preset.value) < 0.01
                                    ? 'bg-white/20 border-white/40 text-white'
                                    : 'bg-black/30 border-white/20 text-white/70 hover:bg-white/10 hover:border-white/30'
                                }`}
                              >
                                <div className="font-semibold">{preset.label}</div>
                                <div className="text-[10px] text-white/60">{preset.desc}</div>
                              </button>
                            ))}
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-white/70">
                              <span>More predictable</span>
                              <span className="font-medium">{temperature.toFixed(2)}</span>
                              <span>More creative</span>
                            </div>
                            <input
                              type="range"
                              min="0.1"
                              max="1.0"
                              step="0.05"
                              value={temperature}
                              onChange={(e) => setTemperature(parseFloat(e.target.value))}
                              className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer slider-thumb"
                              style={{
                                background: `linear-gradient(to right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.3) ${((temperature - 0.1) / (1.0 - 0.1)) * 100}%, rgba(255,255,255,0.1) ${((temperature - 0.1) / (1.0 - 0.1)) * 100}%, rgba(255,255,255,0.1) 100%)`
                              }}
                            />
                            <div className="flex justify-between text-[10px] text-white/50">
                              <span>0.1</span>
                              <span>0.5</span>
                              <span>1.0</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Top P Control */}
                      <div className="grid gap-3">
                        <Label className="text-white/90">Voice Diversity (Top P)</Label>
                        <div className="space-y-3">
                          {/* Top P Presets */}
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { value: 0.5, label: 'Focused', desc: 'Precise' },
                              { value: 0.8, label: 'Balanced', desc: 'Standard' },
                              { value: 0.9, label: 'Diverse', desc: 'Default' }
                            ].map((preset) => (
                              <button
                                key={preset.value}
                                onClick={() => setTopP(preset.value)}
                                className={`p-2 rounded-lg border text-xs font-medium transition-all duration-200 ${
                                  Math.abs(topP - preset.value) < 0.01
                                    ? 'bg-white/20 border-white/40 text-white'
                                    : 'bg-black/30 border-white/20 text-white/70 hover:bg-white/10 hover:border-white/30'
                                }`}
                              >
                                <div className="font-semibold">{preset.label}</div>
                                <div className="text-[10px] text-white/60">{preset.desc}</div>
                              </button>
                            ))}
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-white/70">
                              <span>Focused</span>
                              <span className="font-medium">{topP.toFixed(2)}</span>
                              <span>Diverse</span>
                            </div>
                            <input
                              type="range"
                              min="0.1"
                              max="1.0"
                              step="0.05"
                              value={topP}
                              onChange={(e) => setTopP(parseFloat(e.target.value))}
                              className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer slider-thumb"
                              style={{
                                background: `linear-gradient(to right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.3) ${((topP - 0.1) / (1.0 - 0.1)) * 100}%, rgba(255,255,255,0.1) ${((topP - 0.1) / (1.0 - 0.1)) * 100}%, rgba(255,255,255,0.1) 100%)`
                              }}
                            />
                            <div className="flex justify-between text-[10px] text-white/50">
                              <span>0.1</span>
                              <span>0.5</span>
                              <span>1.0</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reset Button */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          setVoiceSpeed(1.0)
                          setTemperature(0.9)
                          setTopP(0.9)
                        }}
                        className="px-4 py-2 text-xs bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white rounded-lg transition-all duration-200"
                      >
                        Reset to Optimal
                      </button>
                    </div>

                    {/* Generate Voice Button - Only show if no voice generated yet */}
                    {!audioUrl && (
                      <Button 
                        onClick={handleGenerateVoice}
                        disabled={isGeneratingVoice || !selectedPerson?.voiceModelId}
                        className="w-full bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 hover:border-green-500/50 text-white font-medium py-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGeneratingVoice ? (
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Generating {selectedPerson?.name} Voice...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Volume2 className="w-5 h-5" />
                            Generate {selectedPerson?.name} Voice
                          </div>
                        )}
                      </Button>
                    )}

                    {/* Audio Player & Regenerate Button - Only show after voice has been generated */}
                    {audioUrl && (
                      <div className="space-y-4">
                        {/* Audio Player */}
                        <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">🎉</span>
                            <h4 className="text-sm font-medium text-green-300">{selectedPerson?.name} Voice Ready!</h4>
                          </div>
                          <audio
                            ref={audioRef}
                            src={audioUrl}
                            className="w-full"
                            controls
                          />
                        </div>
                        
                        {/* Regenerate Button */}
                        <div className="space-y-3">
                          <Button 
                            onClick={handleGenerateVoice}
                            disabled={isGeneratingVoice}
                            className="w-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 hover:border-blue-500/50 text-white font-medium py-3 rounded-xl transition-all duration-200"
                          >
                            {isGeneratingVoice ? (
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Regenerating Voice...
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Volume2 className="w-4 h-4" />
                                Regenerate Voice
                              </div>
                            )}
                          </Button>
                          

                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}



        {/* Music Search and Player Section - Only show after voice is generated */}
        {audioUrl && (
          <div className="bg-black/30 backdrop-blur-md border border-white/20 shadow-2xl mt-8 rounded-2xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-white flex items-center gap-3 text-base font-medium mb-4">
                <div className="w-7 h-7 bg-white/10 text-white/60 rounded-full flex items-center justify-center text-xs font-medium border border-white/20">
                  4
                </div>
                <span>Add Background Music</span>
              </h3>
              <p className="text-white/60 text-sm mt-2">
                Search and play background music for your content
              </p>
            </div>
            <div className="px-6 pb-6">

            {/* Music Categories */}
            <div className="mb-6">
              <h4 className="text-white/80 text-sm font-medium mb-4">Music Categories - Choose your vibe</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {[
                  { label: 'Epic Orchestral', query: 'epic orchestral cinematic instrumental' },
                  { label: 'Motivational Gym', query: 'motivational workout gym music' },
                  { label: 'Business Success', query: 'success mindset business music' },
                  { label: 'Deep Focus', query: 'focus study concentration music' },
                  { label: 'Dark Trap', query: 'dark trap beats instrumental' },
                  { label: 'Cinematic Drama', query: 'cinematic dramatic trailer music' },
                  { label: 'Hip Hop Beats', query: 'hip hop instrumental beats' },
                  { label: 'Ambient Chill', query: 'ambient chill relaxing music' },
                  { label: 'Electronic Epic', query: 'electronic epic dubstep music' },
                  { label: 'Piano Emotional', query: 'emotional piano instrumental' },
                  { label: 'Rock Energy', query: 'energetic rock instrumental' },
                  { label: 'Synthwave', query: 'synthwave retro 80s instrumental' }
                ].map((category) => (
                  <Button
                    key={category.label}
                    onClick={() => searchMusic(category.query)}
                    disabled={isLoadingMusic}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white text-xs px-3 py-2 h-auto rounded-lg font-normal"
                  >
                    {category.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex gap-3 mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/30 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      searchMusic(searchQuery || 'motivational workout gym music')
                    }
                  }}
                  placeholder="Search for background music..."
                  className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-4 py-3 pl-10 focus:border-white/20 focus:bg-white/10 focus:outline-none transition-all duration-200 placeholder:text-white/40"
                />
              </div>
              <Button
                onClick={() => searchMusic(searchQuery || 'motivational workout gym music')}
                disabled={isLoadingMusic}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 rounded-lg"
              >
                {isLoadingMusic ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Hidden YouTube Player for background music - Music Minimal Config */}
            {playingVideoId && (
              <div className="hidden">
                <YouTube
                  key={`${playingVideoId}-${playerKey}`}
                  videoId={playingVideoId}
                  opts={{
                    width: '1',
                    height: '1',
                    playerVars: {
                      // Music Minimal configuration - works for YouTube Music content
                      autoplay: 0, // Disabled for mobile compatibility
                      enablejsapi: 1,
                    },
                  }}
                  onReady={(event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                    console.log('🎵 YouTube player ready with Music Minimal config')
                    youtubePlayerRef.current = event.target
                    setIsPlayerReady(true)
                    
                    if (initTimeout) {
                      clearTimeout(initTimeout)
                      setInitTimeout(null)
                    }
                    
                    // Automatically try to play on desktop, require click on mobile
                    try {
                      if (!/Mobile|Android|iPhone|iPad/.test(navigator.userAgent)) {
                        // Desktop - try autoplay
                        event.target.playVideo()
                      } else {
                        // Mobile - require user interaction
                        setIsPlaying(false)
                        toast.info(`Ready to play: ${selectedTrack?.title}. Click Play button.`)
                      }
                    } catch (error) {
                      console.log('🎵 Could not auto-play, user interaction required:', error)
                      setIsPlaying(false)
                      toast.info(`Ready to play: ${selectedTrack?.title}. Click Play button.`)
                    }
                  }}
                  onPlay={() => {
                    console.log('🎵 YouTube Music player started playing')
                    setIsPlaying(true)
                  }}
                  onPause={() => {
                    console.log('🎵 YouTube Music player paused')
                    setIsPlaying(false)
                  }}
                  onEnd={() => {
                    console.log('🎵 YouTube Music player ended')
                    setIsPlaying(false)
                  }}
                  onError={(error) => {
                    const playerError = error as YouTubePlayerError;
                    const errorCode = playerError?.data
                    console.log('🎵 YouTube Music player error:', errorCode)
                    
                    if (errorCode === 150 || errorCode === 101) {
                      toast.error('Music track restricted. Trying another...')
                    } else {
                      toast.error('Failed to load music track')
                    }
                    
                    setPlayerError(`Error: ${errorCode}`)
                    setIsPlaying(false)
                    setIsPlayerReady(false)
                  }}
                />
              </div>
            )}

            {/* Music Tracks List */}
            {isLoadingMusic ? (
              <div className="flex items-center justify-center p-8">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span className="text-white/60">Searching for music...</span>
                </div>
              </div>
            ) : musicTracks.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-white/80 text-sm font-medium">Select Background Music</h4>
                  <span className="text-xs text-white/50">{musicTracks.length} tracks found</span>
                </div>
                
                {/* Mobile Instructions and Safari Warning */}
                {(/Mobile|Android|iPhone|iPad/.test(navigator.userAgent) || (playerError && /Safari/.test(navigator.userAgent) && /Mobile/.test(navigator.userAgent))) && (
                  <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                      </div>
                      <div>
                        <h5 className="text-amber-200 font-medium text-sm mb-1">Mobile Music Playback</h5>
                        <p className="text-amber-200/80 text-xs leading-relaxed">
                          📱 On mobile devices, you need to manually tap the <strong>Play</strong> button to start music due to browser autoplay restrictions. 
                          {playerError && ' If music fails to load, try the Retry button or switch to Chrome/Firefox mobile.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {musicTracks.map((track) => (
                    <div
                      key={track.id}
                      onClick={() => {
                        if (selectedTrack?.id === track.id) {
                          if (isPlaying) {
                            youtubePlayerRef.current?.pauseVideo()
                          } else {
                            youtubePlayerRef.current?.playVideo()
                          }
                        } else {
                          playTrack(track)
                        }
                      }}
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedTrack?.id === track.id
                          ? 'bg-green-500/10 border-green-500/30 ring-1 ring-green-500/20'
                          : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Track Thumbnail */}
                        <div className={`w-14 h-14 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 border transition-all duration-200 ${
                          selectedTrack?.id === track.id 
                            ? 'border-white/30 ring-1 ring-white/20' 
                            : 'border-white/10'
                        }`}>
                          <Image
                            src={track.thumbnail}
                            alt={track.title}
                            width={56}
                            height={56}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = '/video-placeholder.png'
                            }}
                          />
                        </div>
                        
                        {/* Track Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-medium text-sm line-clamp-1 mb-1">
                            {track.title}
                          </h4>
                          <p className="text-white/50 text-xs line-clamp-1 mb-1">
                            {track.artist}
                          </p>
                          <p className="text-white/30 text-xs">
                            {track.duration}
                          </p>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (selectedTrack?.id !== track.id) {
                                playTrack(track)
                                return;
                              }
                              
                              // If there's an error, retry
                              if (playerError) {
                                retryPlayTrack()
                                return;
                              }
                              
                              if (isPlaying) {
                                youtubePlayerRef.current?.pauseVideo()
                              } else if (isPlayerReady) {
                                youtubePlayerRef.current?.playVideo()
                              }
                            }}
                            className={`text-xs px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                              selectedTrack?.id === track.id && playingVideoId && isPlaying
                                ? 'bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-300'
                                : selectedTrack?.id === track.id && !isPlaying && isPlayerReady
                                ? 'bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300'
                                : 'bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white'
                            }`}
                          >
                            {selectedTrack?.id === track.id && playingVideoId && isPlaying ? (
                              <>
                                <Pause className="w-3 h-3 mr-1" />
                                Pause
                              </>
                            ) : selectedTrack?.id === track.id && playerError ? (
                              <>
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Retry
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 mr-1" />
                                Play
                              </>
                            )}
                          </Button>
                          
                        </div>
                          
                          {/* Selected Indicator */}
                          {selectedTrack?.id === track.id && (
                            <div className="flex items-center justify-center w-8 h-8 bg-green-500/20 border border-green-500/40 rounded-full flex-shrink-0">
                              <Check className="w-4 h-4 text-green-400" />
                            </div>
                          )}
                          
                          {/* Selection Status Text */}
                          {selectedTrack?.id === track.id && (
                            <div className="text-xs text-green-400 font-medium">
                              ✓ Selected
                            </div>
                          )}
                      </div>

                      {/* Timeline Progress Bar - Only show for currently playing track */}
                      {selectedTrack?.id === track.id && playingVideoId && isPlaying && (
                        <div className="mt-3 pt-3 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-white/50 w-10 text-right font-mono">
                              {formatTime(currentTime)}
                            </span>
                            <div className="flex-1 relative">
                              <input
                                type="range"
                                min={0}
                                max={trackDuration || 100}
                                value={currentTime || 0}
                                onChange={handleSeek}
                                onMouseDown={handleSeekStart}
                                onMouseUp={handleSeekEnd}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider-thumb"
                                style={{
                                  background: `linear-gradient(to right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.3) ${trackDuration > 0 ? (currentTime / trackDuration) * 100 : 0}%, rgba(255,255,255,0.1) ${trackDuration > 0 ? (currentTime / trackDuration) * 100 : 0}%, rgba(255,255,255,0.1) 100%)`
                                }}
                              />
                            </div>
                            <span className="text-xs text-white/50 w-10 font-mono">
                              {formatTime(trackDuration)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center p-12">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                  <Music className="w-8 h-8 text-white/30" />
                </div>
                <p className="text-white/50 mb-4">No music found. Try a different search term.</p>
                <Button
                  onClick={() => searchMusic('motivational workout gym music')}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-2 rounded-lg"
                >
                  Load Default Music
                </Button>
              </div>
            )}
          </div>
        </div>
        )}
      </main>
    </div>
  )
} 