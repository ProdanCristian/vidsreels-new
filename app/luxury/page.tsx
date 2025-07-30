"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import DashboardHeader from '@/components/dashboard-header'
import { Crown, Sparkles, Volume2, Mic, Check, Music, Play, Pause, Edit3, Save, X } from 'lucide-react'
import Image from 'next/image'

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
  audioUrl?: string // Direct audio URL for AI-generated music
  style?: string
  state?: string
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

  // Music generation states
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([])
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [musicPrompt, setMusicPrompt] = useState('')
  const [musicStyle, setMusicStyle] = useState('instrumental, cinematic, epic')
  const [generationTaskId, setGenerationTaskId] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [trackDuration, setTrackDuration] = useState(0)
  const [musicProgress, setMusicProgress] = useState(0)
  
  // Progress tracking
  const [currentStep, setCurrentStep] = useState(0) // 0: person, 1: script, 2: voice, 3: music
  const [showScrollHint, setShowScrollHint] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const musicAudioRef = useRef<HTMLAudioElement>(null)
  
  // Section refs for auto-scroll
  const personSectionRef = useRef<HTMLDivElement>(null)
  const scriptSectionRef = useRef<HTMLDivElement>(null)
  const voiceSectionRef = useRef<HTMLDivElement>(null)
  const musicSectionRef = useRef<HTMLDivElement>(null)

  // Progress tracking helper
  const updateProgress = (step: number) => {
    setCurrentStep(step)
    // Show scroll hint for 3 seconds
    setShowScrollHint(true)
    setTimeout(() => setShowScrollHint(false), 3000)
  }

  // Update music progress for AI-generated tracks
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isPlaying && selectedTrack?.audioUrl && musicAudioRef.current) {
      interval = setInterval(() => {
        const audio = musicAudioRef.current
        if (audio) {
          setCurrentTime(audio.currentTime)
          setTrackDuration(audio.duration || 0)
          setMusicProgress((audio.currentTime / (audio.duration || 1)) * 100)
        }
      }, 250)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isPlaying, selectedTrack])

  // Add guard clause for playerInstance in the effect

  // Format time for display
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Handle timeline seek for AI-generated music
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value)
    setCurrentTime(seekTime)
    
    if (musicAudioRef.current) {
      musicAudioRef.current.currentTime = seekTime
    }
  }

  // Generate AI music using Suno API
  const generateMusic = async (prompt: string, style: string = 'instrumental, cinematic, epic') => {
    console.log('🎵 Starting AI music generation with prompt:', prompt)
    setIsGeneratingMusic(true)
    setMusicTracks([])
    
    try {
      const response = await fetch('/api/generate-music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          style: style,
          instrumental: true
        })
      })

      console.log('🎵 Response status:', response.status, response.ok)
      
      if (!response.ok) {
        throw new Error('Failed to generate music')
      }
      
      const data = await response.json()
      console.log('🎵 Suno API Response:', data)
      
      if (data.success && data.tracks) {
        setMusicTracks(data.tracks)
        setGenerationTaskId(data.task_id)
        
        // If generation is still in progress, start polling
        if (data.tracks.length === 0 && data.task_id) {
          pollMusicGeneration(data.task_id)
        }
      } else {
        throw new Error(data.error || 'Music generation failed')
      }
      
    } catch (error) {
      console.error('🎵 Error generating music:', error)
    } finally {
      setIsGeneratingMusic(false)
    }
  }

  // Poll for music generation status
  const pollMusicGeneration = async (taskId: string) => {
    const maxAttempts = 30 // 5 minutes max (10 second intervals)
    let attempts = 0
    
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/generate-music?task_id=${taskId}`)
        
        if (response.ok) {
          const data = await response.json()
          
          if (data.success && data.tracks) {
            const completedTracks = data.tracks.filter((track: MusicTrack) => track.state === 'succeeded')
            
            if (completedTracks.length > 0) {
              setMusicTracks(completedTracks)
              setIsGeneratingMusic(false)
              return
            }
            
            // Check if any tracks failed
            const failedTracks = data.tracks.filter((track: MusicTrack) => track.state === 'error')
            if (failedTracks.length > 0) {
              console.error('🎵 Music generation failed')
              setIsGeneratingMusic(false)
              return
            }
          }
        }
        
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000) // Check every 10 seconds
        } else {
          console.error('🎵 Music generation timeout')
          setIsGeneratingMusic(false)
        }
        
      } catch (error) {
        console.error('🎵 Error checking generation status:', error)
        setIsGeneratingMusic(false)
      }
    }
    
    setTimeout(checkStatus, 10000) // Start checking after 10 seconds
  }

  // Generate default AI music for the content
  const generateDefaultMusic = async () => {
    const defaultPrompts = [
      'Epic cinematic background music for motivational content',
      'Inspiring instrumental music with orchestral elements',
      'Powerful background music for success and achievement'
    ]
    
    const randomPrompt = defaultPrompts[Math.floor(Math.random() * defaultPrompts.length)]
    await generateMusic(randomPrompt, 'instrumental, cinematic, epic, motivational')
  }

  // Handle music playback for AI-generated tracks
  const handlePlayMusic = () => {
    if (!selectedTrack?.audioUrl) {
      console.log('🎵 No track selected or no audio URL')
      return
    }

    console.log('🎵 Attempting to play:', selectedTrack.title)
    
    const audio = musicAudioRef.current
    if (audio) {
      try {
        if (isPlaying) {
          audio.pause()
          setIsPlaying(false)
          console.log('🎵 Paused music')
        } else {
          audio.play()
          setIsPlaying(true)
          console.log('🎵 Started playing music')
        }
      } catch (error) {
        console.log('🎵 Audio playback failed:', error)
      }
    }
  }

  // Select and play AI-generated track
  const playTrack = (track: MusicTrack) => {
    console.log('🎵 Selecting new track:', track.title)
    
    if (!track.audioUrl) {
      console.log('🎵 No audio URL available for track')
      return
    }

    // If same track is already selected, just toggle play/pause
    if (selectedTrack?.id === track.id) {
      handlePlayMusic()
      return
    }

    // Stop current track
    if (musicAudioRef.current) {
      musicAudioRef.current.pause()
      musicAudioRef.current.currentTime = 0
    }

    setSelectedTrack(track)
    setIsPlaying(false)
    setCurrentTime(0)
    setTrackDuration(0)
    setMusicProgress(0)
    
    console.log('🎵 Track selected:', track.title)
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
      updateProgress(2) // Voice generation step

    } catch (error) {
      console.error('Error generating script:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Optimize custom script for voice generation
  const handleOptimizeScript = async () => {
    if (!selectedPerson) {
      return
    }

    if (!customScript.trim()) {
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

    } catch (error) {
      console.error('Error optimizing script:', error)
    } finally {
      setIsOptimizingScript(false)
    }
  }

  // Handle voice generation (simplified for single script)
  const handleGenerateVoice = async () => {
    if (!generatedScript) {
      return
    }

    if (!selectedPerson?.voiceModelId) {
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
      
      // Generate AI music after voice generation
      await generateDefaultMusic()
      updateProgress(3) // Music selection step
      
    } catch (error) {
      console.error('Error generating voice:', error)
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
      
             {/* Progress Indicator - Sticky positioned right under dashboard header */}
       <div className="sticky top-[64px] sm:top-[80px] z-40 bg-background/80 backdrop-blur-md border-b border-white/10 py-3 sm:py-4">
         <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex items-center justify-center gap-1 sm:gap-2 md:gap-4 mb-3 sm:mb-4 px-2 sm:px-4">
            {/* Step 1: Person Selection */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold border-2 transition-all duration-300 shadow-lg ${
                currentStep >= 0 
                  ? 'bg-green-500/20 border-green-500 text-green-300 shadow-green-500/20' 
                  : 'bg-white/10 border-white/20 text-white/60'
              }`}>
                1
              </div>
              <span className={`text-xs sm:text-sm font-medium transition-all duration-300 hidden sm:inline ${
                currentStep >= 0 ? 'text-white' : 'text-white/60'
              }`}>
                Person
              </span>
            </div>

            {/* Connection Line */}
            <div className={`w-4 sm:w-8 md:w-16 h-0.5 sm:h-1 rounded-full transition-all duration-500 ${
              currentStep >= 1 ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-white/20'
            }`}></div>

            {/* Step 2: Script Generation */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold border-2 transition-all duration-300 shadow-lg ${
                currentStep >= 1 
                  ? 'bg-green-500/20 border-green-500 text-green-300 shadow-green-500/20' 
                  : 'bg-white/10 border-white/20 text-white/60'
              }`}>
                2
              </div>
              <span className={`text-xs sm:text-sm font-medium transition-all duration-300 hidden sm:inline ${
                currentStep >= 1 ? 'text-white' : 'text-white/60'
              }`}>
                Script
              </span>
            </div>

            {/* Connection Line */}
            <div className={`w-4 sm:w-8 md:w-16 h-0.5 sm:h-1 rounded-full transition-all duration-500 ${
              currentStep >= 2 ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-white/20'
            }`}></div>

            {/* Step 3: Voice Generation */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold border-2 transition-all duration-300 shadow-lg ${
                currentStep >= 2 
                  ? 'bg-green-500/20 border-green-500 text-green-300 shadow-green-500/20' 
                  : 'bg-white/10 border-white/20 text-white/60'
              }`}>
                3
              </div>
              <span className={`text-xs sm:text-sm font-medium transition-all duration-300 hidden sm:inline ${
                currentStep >= 2 ? 'text-white' : 'text-white/60'
              }`}>
                Voice
              </span>
            </div>

            {/* Connection Line */}
            <div className={`w-4 sm:w-8 md:w-16 h-0.5 sm:h-1 rounded-full transition-all duration-500 ${
              currentStep >= 3 ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-white/20'
            }`}></div>

            {/* Step 4: Music Selection */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold border-2 transition-all duration-300 shadow-lg ${
                currentStep >= 3 
                  ? 'bg-green-500/20 border-green-500 text-green-300 shadow-green-500/20' 
                  : 'bg-white/10 border-white/20 text-white/60'
              }`}>
                4
              </div>
              <span className={`text-xs sm:text-sm font-medium transition-all duration-300 hidden sm:inline ${
                currentStep >= 3 ? 'text-white' : 'text-white/60'
              }`}>
                Music
              </span>
            </div>
          </div>

          {/* Scroll Hint */}
          {showScrollHint && (
            <div className="flex items-center justify-center gap-2 text-green-300 text-sm animate-pulse">
              <div className="w-4 h-4 border-2 border-green-300 border-t-transparent rounded-full animate-spin"></div>
              <span>Continue to next step below ↓</span>
            </div>
          )}
        </div>
      </div>
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-6 sm:pt-8">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Crown className="w-8 h-8 md:w-12 md:h-12 text-white mr-3" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              AI Luxury Reels Generation
            </h1>
          </div>
          <p className="text-sm text-white/70 mb-1 max-w-2xl mx-auto">
            Choose any famous voice → AI generates the script → Create viral reels in seconds
          </p>
        </div>

        {/* Famous Person Selection - Trigger Button */}
        <div ref={personSectionRef} className="bg-black/30 backdrop-blur-md border border-white/20 shadow-2xl mb-6 sm:mb-8 rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="w-7 h-7 bg-white/10 text-white/60 rounded-full flex items-center justify-center text-xs font-medium border border-white/20">
                1
              </div>
              <span className="text-white font-medium text-base">Choose Your Famous Person</span>
            </div>
            
            {selectedPerson ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white font-bold text-lg sm:text-xl ring-2 ring-white/20 flex-shrink-0">
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
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-white text-base sm:text-lg mb-1 line-clamp-1">{selectedPerson.name}</h3>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r ${getPersonGradient(selectedPerson.category)} bg-opacity-20 border border-white/20`}>
                        {selectedPerson.category}
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-white/70 line-clamp-2 sm:line-clamp-1 leading-relaxed">{selectedPerson.description}</p>
                  </div>
                </div>
                <Dialog open={isPersonModalOpen} onOpenChange={setIsPersonModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-white/20 hover:bg-white/30 border border-white/30 text-white w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 text-sm font-medium">
                      <Edit3 className="w-4 h-4 mr-2" />
                      Change Person
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-black/95 backdrop-blur-md border border-white/20 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-white text-xl font-bold flex items-center gap-2">
                        <Crown className="w-6 h-6" />
                        Choose Your Famous Person
                      </DialogTitle>
                      <DialogDescription className="text-white/70">
                        Select a famous person to generate a personalized script in their style and voice
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4">
                      {famousPeople.map((person) => (
                        <div
                          key={person.id}
                          onClick={() => {
                            setSelectedPerson(person)
                            setIsPersonModalOpen(false)
                            updateProgress(1) // Script generation step
                          }}
                          className={`relative p-3 sm:p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                            selectedPerson?.id === person.id
                              ? 'bg-white/20 border-white/40 ring-2 ring-white/30 shadow-lg'
                              : 'bg-black/30 border-white/10 hover:border-white/30 hover:bg-white/10 active:bg-white/15'
                          }`}
                        >
                          {/* Avatar */}
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white font-bold text-lg sm:text-xl mb-3 mx-auto ring-1 ring-white/20 hover:ring-white/40 shadow-lg transition-all duration-300 flex-shrink-0">
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
                            <h3 className="font-bold text-white text-base sm:text-lg mb-1 line-clamp-1">{person.name}</h3>
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full mb-2 bg-gradient-to-r ${getPersonGradient(person.category)} bg-opacity-20 border border-white/20`}>
                              <span className="font-medium">{person.category}</span>
                            </div>
                            <p className="text-xs sm:text-sm text-white/70 mb-3 line-clamp-2 leading-relaxed px-1">{person.description}</p>
                            
                            {/* Voice Status */}
                            <div className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-medium ${
                              person.voiceModelId 
                                ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                                : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                            }`}>
                              <Mic className="w-3 h-3" />
                              {person.voiceModelId ? 'Voice Ready' : 'Coming Soon'}
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
                  <Button className="w-full bg-white/20 hover:bg-white/30 border border-white/30 text-white py-6 sm:py-8 text-base sm:text-lg font-medium">
                    <Crown className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                    Select Famous Person
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-black/95 backdrop-blur-md border border-white/20 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-white text-xl font-bold flex items-center gap-2">
                      <Crown className="w-6 h-6" />
                      Choose Your Famous Person
                    </DialogTitle>
                    <DialogDescription className="text-white/70">
                      Select a famous person to generate a personalized script in their style and voice
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4">
                    {famousPeople.map((person) => (
                      <div
                        key={person.id}
                        onClick={() => {
                          setSelectedPerson(person)
                          setIsPersonModalOpen(false)
                          updateProgress(1) // Script generation step
                        }}
                        className="relative p-3 sm:p-4 rounded-xl border cursor-pointer transition-all duration-200 bg-black/30 border-white/10 hover:border-white/30 hover:bg-white/10 active:bg-white/15"
                      >
                        {/* Avatar */}
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white font-bold text-lg sm:text-xl mb-3 mx-auto ring-1 ring-white/20 hover:ring-white/40 shadow-lg transition-all duration-300 flex-shrink-0">
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
                          <h3 className="font-bold text-white text-base sm:text-lg mb-1 line-clamp-1">{person.name}</h3>
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full mb-2 bg-gradient-to-r ${getPersonGradient(person.category)} bg-opacity-20 border border-white/20`}>
                            <span className="font-medium">{person.category}</span>
                          </div>
                          <p className="text-xs sm:text-sm text-white/70 mb-3 line-clamp-2 leading-relaxed px-1">{person.description}</p>
                          
                          {/* Voice Status */}
                          <div className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-medium ${
                            person.voiceModelId 
                              ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                              : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                          }`}>
                            <Mic className="w-3 h-3" />
                            {person.voiceModelId ? 'Voice Ready' : 'Coming Soon'}
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
          <div ref={scriptSectionRef} className="bg-black/30 backdrop-blur-md border border-white/20 shadow-2xl mb-8 rounded-2xl overflow-hidden">
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
                        return
                      }
                      setGeneratedScript(customScript.trim())
                      updateProgress(2) // Voice generation step
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
          <div ref={voiceSectionRef} className="bg-black/30 backdrop-blur-md border border-white/20 shadow-2xl mb-8 rounded-2xl overflow-hidden">
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



        {/* AI Music Generation Section - Only show after voice is generated */}
        {audioUrl && (
          <div ref={musicSectionRef} className="bg-black/30 backdrop-blur-md border border-white/20 shadow-2xl mt-8 rounded-2xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-white flex items-center gap-3 text-base font-medium mb-4">
                <div className="w-7 h-7 bg-white/10 text-white/60 rounded-full flex items-center justify-center text-xs font-medium border border-white/20">
                  4
                </div>
                <span>Generate AI Background Music</span>
              </h3>
              <p className="text-white/60 text-sm mt-2">
                Generate custom AI music that perfectly fits your content using Suno AI
              </p>
            </div>
            <div className="px-6 pb-6">

            {/* Music Generation Form */}
            <div className="mb-6 space-y-4">
              <div>
                <label className="text-white/80 text-sm font-medium mb-2 block">Music Description</label>
                <textarea
                  value={musicPrompt}
                  onChange={(e) => setMusicPrompt(e.target.value)}
                  placeholder="Describe the music you want... e.g., 'Epic cinematic background music for motivational content'"
                  className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-4 py-3 focus:border-white/20 focus:bg-white/10 focus:outline-none transition-all duration-200 placeholder:text-white/40 resize-none"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="text-white/80 text-sm font-medium mb-2 block">Music Style</label>
                <select
                  value={musicStyle}
                  onChange={(e) => setMusicStyle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-4 py-3 focus:border-white/20 focus:bg-white/10 focus:outline-none transition-all duration-200"
                >
                  <option value="instrumental, cinematic, epic">Epic Cinematic</option>
                  <option value="instrumental, motivational, uplifting">Motivational Uplifting</option>
                  <option value="instrumental, ambient, calm">Ambient Calm</option>
                  <option value="instrumental, rock, energetic">Energetic Rock</option>
                  <option value="instrumental, electronic, modern">Modern Electronic</option>
                  <option value="instrumental, orchestral, dramatic">Orchestral Dramatic</option>
                </select>
              </div>

              {/* Generate Button */}
              <Button
                onClick={() => {
                  const prompt = musicPrompt.trim() || 'Epic cinematic background music for motivational content'
                  generateMusic(prompt, musicStyle)
                }}
                disabled={isGeneratingMusic}
                className="w-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border border-purple-500/30 hover:border-purple-500/50 text-white font-medium py-4 rounded-xl transition-all duration-200"
              >
                {isGeneratingMusic ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Generating AI Music... (This may take 1-2 minutes)
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Generate AI Music
                  </div>
                )}
              </Button>
              
              {/* Quick Generation Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {[
                  { label: 'Epic Motivation', prompt: 'Epic cinematic background music for motivational content', style: 'instrumental, cinematic, epic, motivational' },
                  { label: 'Success Anthem', prompt: 'Powerful anthem music for success and achievement', style: 'instrumental, orchestral, triumphant' },
                  { label: 'Focus Flow', prompt: 'Calm ambient music for focus and concentration', style: 'instrumental, ambient, peaceful' }
                ].map((preset) => (
                  <Button
                    key={preset.label}
                    onClick={() => generateMusic(preset.prompt, preset.style)}
                    disabled={isGeneratingMusic}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white text-xs px-3 py-2 h-auto rounded-lg font-normal"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Hidden Audio Player for AI-generated music */}
            {selectedTrack?.audioUrl && (
              <audio
                ref={musicAudioRef}
                src={selectedTrack.audioUrl}
                onLoadedMetadata={() => {
                  if (musicAudioRef.current) {
                    setTrackDuration(musicAudioRef.current.duration)
                  }
                }}
                onTimeUpdate={() => {
                  if (musicAudioRef.current) {
                    setCurrentTime(musicAudioRef.current.currentTime)
                    setMusicProgress((musicAudioRef.current.currentTime / (musicAudioRef.current.duration || 1)) * 100)
                  }
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            )}

            {/* AI Music Tracks List */}
            {isGeneratingMusic ? (
              <div className="flex items-center justify-center p-8">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span className="text-white/60">Generating AI music... Please wait 1-2 minutes</span>
                </div>
              </div>
            ) : musicTracks.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-white/80 text-sm font-medium">AI Generated Music</h4>
                  <span className="text-xs text-white/50">{musicTracks.length} track{musicTracks.length !== 1 ? 's' : ''} generated</span>
                </div>

                <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                  {musicTracks.map((track) => (
                    <div
                      key={track.id}
                      onClick={(e) => {
                        // Don't trigger if clicking on the play button
                        if ((e.target as HTMLElement).closest('button')) {
                          return
                        }
                        
                        // If track is already selected, toggle play/pause directly
                        if (selectedTrack?.id === track.id) {
                          handlePlayMusic() // Use consistent play/pause logic
                        } else {
                          // Select new track (will auto-play when ready)
                          playTrack(track)
                        }
                      }}
                      className={`p-3 sm:p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedTrack?.id === track.id
                          ? 'bg-green-500/10 border-green-500/30 ring-1 ring-green-500/20'
                          : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8 active:bg-white/12'
                      }`}
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        {/* Track Thumbnail */}
                        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 border transition-all duration-200 ${
                          selectedTrack?.id === track.id 
                            ? 'border-green-500/40 ring-1 ring-green-500/20 shadow-lg shadow-green-500/10' 
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
                        <div className="flex-1 min-w-0 pr-2">
                          <h4 className="text-white font-medium text-sm sm:text-base line-clamp-1 mb-1">
                            {track.title}
                          </h4>
                          <p className="text-white/50 text-xs sm:text-sm line-clamp-1 mb-1">
                            {track.artist}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-white/30 text-xs">
                              {track.duration}
                            </p>
                            {selectedTrack?.id === track.id && (
                              <div className="flex items-center gap-1">
                                <Check className="w-3 h-3 text-green-400" />
                                <span className="text-green-400 text-xs font-medium">
                                  Selected
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Action Button - Only show when track is selected */}
                        {selectedTrack?.id === track.id ? (
                          <div className="flex items-center">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handlePlayMusic()
                              }}
                              className={`text-xs sm:text-sm px-4 sm:px-5 py-2.5 sm:py-3 rounded-full font-medium transition-all duration-200 min-w-[80px] sm:min-w-[90px] ${
                                isPlaying
                                  ? 'bg-green-500/30 hover:bg-green-500/40 border-2 border-green-400/60 text-green-200 shadow-lg shadow-green-500/20'
                                  : 'bg-blue-500/30 hover:bg-blue-500/40 border-2 border-blue-400/60 text-blue-200 shadow-lg shadow-blue-500/20'
                              }`}
                            >
                              {isPlaying ? (
                                <div className="flex items-center justify-center gap-1 sm:gap-2">
                                  <Pause className="w-4 h-4" />
                                  <span className="font-semibold">PAUSE</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1 sm:gap-2">
                                  <Play className="w-4 h-4" />
                                  <span className="font-semibold">PLAY</span>
                                </div>
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                playTrack(track)
                              }}
                              className="text-xs sm:text-sm px-4 sm:px-5 py-2.5 sm:py-3 rounded-full font-medium transition-all duration-200 min-w-[80px] sm:min-w-[90px] bg-white/10 hover:bg-white/20 border border-white/30 text-white/90 hover:text-white hover:border-white/50"
                            >
                              <div className="flex items-center justify-center gap-1 sm:gap-2">
                                <span className="font-semibold">SELECT</span>
                              </div>
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Timeline Progress Bar - Only show for currently playing track */}
                      {selectedTrack?.id === track.id && selectedTrack.audioUrl && isPlaying && (
                        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <span className="text-xs text-white/50 w-8 sm:w-10 text-right font-mono">
                              {formatTime(currentTime)}
                            </span>
                            <div className="flex-1 relative">
                              <input
                                type="range"
                                min={0}
                                max={trackDuration || 100}
                                value={currentTime || 0}
                                onChange={handleSeek}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider-thumb touch-manipulation"
                                style={{
                                  background: `linear-gradient(to right, rgba(34,197,94,0.6) 0%, rgba(34,197,94,0.6) ${trackDuration > 0 ? (currentTime / trackDuration) * 100 : 0}%, rgba(255,255,255,0.1) ${trackDuration > 0 ? (currentTime / trackDuration) * 100 : 0}%, rgba(255,255,255,0.1) 100%)`
                                }}
                              />
                            </div>
                            <span className="text-xs text-white/50 w-8 sm:w-10 font-mono">
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
                <p className="text-white/50 mb-4">No AI music generated yet. Click "Generate AI Music" above to create custom background music.</p>
                <Button
                  onClick={() => generateDefaultMusic()}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-2 rounded-lg"
                >
                  Generate Default Music
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