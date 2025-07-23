"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import DashboardHeader from '@/components/dashboard-header'
import { Crown, Sparkles, Edit3, Volume2, Play, Pause, Download, Save, FolderOpen, Clock } from 'lucide-react'

interface SavedScript {
  id: string
  title: string
  content: string
  topic: string
  duration: number
  isGenerated: boolean
  createdAt: string
}

export default function LuxuryScriptGenerator() {
  const [videoTopic, setVideoTopic] = useState('motivational')
  const [duration, setDuration] = useState('30')
  const [customPrompt, setCustomPrompt] = useState('')
  const [scriptMode, setScriptMode] = useState<'generate' | 'custom' | 'saved'>('generate')
  const [customScript, setCustomScript] = useState('')
  const [generatedScripts, setGeneratedScripts] = useState<string[]>([])
  const [selectedScriptIndex, setSelectedScriptIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  
  // Save functionality
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveTitle, setSaveTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  
  // Saved scripts
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>([])
  const [selectedSavedScript, setSelectedSavedScript] = useState<SavedScript | null>(null)
  const [isLoadingSavedScripts, setIsLoadingSavedScripts] = useState(false)
  
  // Voice generation states
  const [selectedVoice, setSelectedVoice] = useState('pNInz6obpgDQGcFmaJgB')
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Character limits based on duration
  const getMaxCharacters = (durationSec: string) => {
    return parseInt(durationSec) * 15 // 15 characters per second
  }

  // Load saved scripts on component mount
  useEffect(() => {
    if (scriptMode === 'saved') {
      fetchSavedScripts()
    }
  }, [scriptMode])

  const fetchSavedScripts = async () => {
    setIsLoadingSavedScripts(true)
    try {
      const response = await fetch('/api/scripts')
      if (response.ok) {
        const data = await response.json()
        setSavedScripts(data.scripts || [])
      }
    } catch (error) {
      console.error('Error fetching saved scripts:', error)
    } finally {
      setIsLoadingSavedScripts(false)
    }
  }

  // ElevenLabs voices for luxury content
  const luxuryVoices = [
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam - Deep & Authoritative', description: 'Perfect for luxury and professional content' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella - Elegant & Sophisticated', description: 'Smooth and refined for premium brands' },
    { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni - Warm & Confident', description: 'Charismatic voice for motivational content' },
    { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold - Rich & Powerful', description: 'Strong masculine voice for authority' },
    { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh - Clear & Professional', description: 'Crisp delivery for business content' }
  ]

  const luxuryTopics = [
    { value: 'motivational', label: 'Motivational Luxury' },
    { value: 'success-mindset', label: 'Success Mindset' },
    { value: 'wealth-creation', label: 'Wealth Creation' },
    { value: 'luxury-lifestyle', label: 'Luxury Lifestyle' },
    { value: 'entrepreneurship', label: 'Entrepreneurship' },
    { value: 'personal-growth', label: 'Personal Growth' },
    { value: 'achievement', label: 'Achievement & Goals' },
    { value: 'premium-products', label: 'Premium Products' },
    { value: 'financial-freedom', label: 'Financial Freedom' },
    { value: 'excellence', label: 'Excellence & Quality' }
  ]

  const handleGenerateScript = async () => {
    if (!videoTopic) return
    setIsLoading(true)
    setGeneratedScripts([])
    setSelectedScriptIndex(0)
    setAudioUrl(null) // Clear previous audio

    const topicLabel = luxuryTopics.find(topic => topic.value === videoTopic)?.label || videoTopic

    // Generate 3 different versions
    let basePrompt = `Create 3 different ${duration}-second luxury ${topicLabel.toLowerCase()} voiceover scripts.

Video Details:
- Topic: ${topicLabel}
- Duration: ${duration} seconds (approximately ${Math.round(parseInt(duration) * 2.5)} words)
- Style: Luxury, premium, sophisticated
- Audience: High-achievers, luxury enthusiasts, ambitious individuals

Requirements:
- Generate 3 DISTINCT versions with different approaches
- Write clean, natural speech text ONLY
- NO timing markers like "(0-3 seconds)"
- NO emotional cues like "[confident]" or "[PAUSE]"
- NO formatting or stage directions
- Just pure, readable script text suitable for voice generation
- Keep each exactly ${duration} seconds when read at normal pace (150-160 words per minute)
- Make each version compelling but with different angles/approaches

Format the response as:
VERSION 1:
[clean script text]

VERSION 2:
[clean script text]

VERSION 3:
[clean script text]`

    // Add custom prompt if provided
    if (customPrompt.trim()) {
      basePrompt += `\n\nAdditional Instructions for all versions:\n${customPrompt.trim()}`
    }

    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: basePrompt }),
      })

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        fullText += chunk
      }

      // Parse the response to extract individual scripts
      const versions = fullText.split(/VERSION \d+:/i).filter(version => version.trim())
      const cleanScripts = versions.map(script => script.trim()).filter(script => script.length > 0)
      
      if (cleanScripts.length > 0) {
        setGeneratedScripts(cleanScripts)
      } else {
        setGeneratedScripts([fullText.trim()])
      }

    } catch (error) {
      console.error('Error generating script:', error)
      setGeneratedScripts(['Failed to generate script. Please try again.'])
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateVoice = async () => {
    let textToConvert = ''
    
    if (scriptMode === 'generate') {
      textToConvert = generatedScripts[selectedScriptIndex]
    } else if (scriptMode === 'custom') {
      textToConvert = customScript
    } else if (scriptMode === 'saved' && selectedSavedScript) {
      textToConvert = selectedSavedScript.content
    }
    
    if (!textToConvert) {
      alert('Please generate, write, or select a script first!')
      return
    }

    setIsGeneratingVoice(true)
    
    try {
      const response = await fetch('/api/generate-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToConvert,
          voiceId: selectedVoice
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate voice')
      }

      const audioBlob = await response.blob()
      const url = URL.createObjectURL(audioBlob)
      setAudioUrl(url)
      
    } catch (error) {
      console.error('Error generating voice:', error)
      alert('Failed to generate voice. Please try again.')
    } finally {
      setIsGeneratingVoice(false)
    }
  }

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleDownloadAudio = () => {
    if (audioUrl) {
      const a = document.createElement('a')
      a.href = audioUrl
      a.download = `luxury-script-voice-${Date.now()}.mp3`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  const handleSaveScript = () => {
    const finalScript = scriptMode === 'generate' ? generatedScripts[selectedScriptIndex] : customScript
    if (finalScript) {
      setShowSaveModal(true)
      // Generate a default title
      const topicLabel = luxuryTopics.find(topic => topic.value === videoTopic)?.label || videoTopic
      setSaveTitle(`${topicLabel} - ${duration}s Script`)
    }
  }

  const handleSaveToDatabase = async () => {
    if (!saveTitle.trim()) {
      alert('Please enter a title for your script')
      return
    }

    const finalScript = scriptMode === 'generate' ? generatedScripts[selectedScriptIndex] : customScript
    
    setIsSaving(true)
    try {
      const response = await fetch('/api/scripts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: saveTitle.trim(),
          content: finalScript,
          topic: videoTopic,
          duration: parseInt(duration),
          isGenerated: scriptMode === 'generate'
        }),
      })

      if (response.ok) {
        alert('Script saved successfully!')
        setShowSaveModal(false)
        setSaveTitle('')
        if (scriptMode === 'saved') {
          fetchSavedScripts() // Refresh saved scripts list
        }
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving script:', error)
      alert('Failed to save script. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-black">
      <DashboardHeader />
      <div className="max-w-4xl mx-auto px-4 py-8 pt-28">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Crown className="w-8 h-8 text-white" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Luxury Script & Voice Generator
            </h1>
          </div>
          <p className="text-sm text-white/70 max-w-2xl mx-auto">
            Create premium voiceover scripts and generate AI voices for luxury videos
          </p>
        </div>

        {/* Mode Selection */}
        <div className="flex justify-center mb-8">
          <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-xl p-1 inline-flex">
            <button
              onClick={() => setScriptMode('generate')}
              className={`px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                scriptMode === 'generate'
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Generate Script
            </button>
            <button
              onClick={() => setScriptMode('custom')}
              className={`px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                scriptMode === 'custom'
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              Custom Script
            </button>
            <button
              onClick={() => setScriptMode('saved')}
              className={`px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                scriptMode === 'saved'
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              Saved Scripts
            </button>
          </div>
        </div>

        {scriptMode === 'generate' ? (
          /* Generate Script Mode */
          <Card className="bg-black/30 backdrop-blur-md border border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Generate Luxury Script
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="topic" className="text-white/90">Video Topic</Label>
                  <select
                    id="topic"
                    value={videoTopic}
                    onChange={(e) => setVideoTopic(e.target.value)}
                    className="bg-black/50 border border-white/20 text-white rounded-xl px-4 py-3 focus:border-white/40 focus:outline-none transition-all duration-200"
                  >
                    {luxuryTopics.map((topic) => (
                      <option key={topic.value} value={topic.value} className="bg-black">
                        {topic.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="duration" className="text-white/90">Duration</Label>
                  <select
                    id="duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="bg-black/50 border border-white/20 text-white rounded-xl px-4 py-3 focus:border-white/40 focus:outline-none transition-all duration-200"
                  >
                    <option value="15" className="bg-black">15 seconds</option>
                    <option value="30" className="bg-black">30 seconds</option>
                    <option value="60" className="bg-black">1 minute</option>
                  </select>
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="custom-prompt" className="text-white/90">Additional Instructions (Optional)</Label>
                  <Textarea
                    id="custom-prompt"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="e.g., 'Make it more dramatic', 'Add a call-to-action', 'Use metaphors about success', 'Include specific luxury brands'..."
                    className="bg-black/50 border border-white/20 text-white rounded-xl px-4 py-3 min-h-[100px] focus:border-white/40 focus:outline-none transition-all duration-200 resize-none"
                  />
                  <p className="text-xs text-white/50">
                    Add specific instructions to customize how the AI generates your luxury script
                  </p>
                </div>

                <Button 
                  onClick={handleGenerateScript} 
                  disabled={isLoading || !videoTopic}
                  className="w-full bg-white/20 hover:bg-white/30 border border-white/30 hover:border-white/50 text-white font-medium py-3 rounded-xl transition-all duration-200"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Generating Script...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Generate Luxury Script
                    </div>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : scriptMode === 'custom' ? (
          /* Custom Script Mode */
          <Card className="bg-black/30 backdrop-blur-md border border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                Custom Script
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="custom-script" className="text-white/90">Write Your Script</Label>
                  <div className="text-xs text-white/60 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {customScript.length}/{getMaxCharacters(duration)} chars
                  </div>
                </div>
                <Textarea
                  id="custom-script"
                  value={customScript}
                  onChange={(e) => {
                    const maxChars = getMaxCharacters(duration)
                    if (e.target.value.length <= maxChars) {
                      setCustomScript(e.target.value)
                    }
                  }}
                  placeholder={`Write your luxury video script here... (Max ${getMaxCharacters(duration)} characters for ${duration} seconds)`}
                  className="bg-black/50 border border-white/20 text-white rounded-xl px-4 py-3 min-h-[200px] focus:border-white/40 focus:outline-none transition-all duration-200 resize-none"
                />
                {customScript.length > getMaxCharacters(duration) * 0.9 && (
                  <p className="text-xs text-yellow-400">
                    ⚠️ Approaching character limit for {duration} seconds
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Saved Scripts Mode */
          <Card className="bg-black/30 backdrop-blur-md border border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                Your Saved Scripts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSavedScripts ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-white/60">Loading your scripts...</p>
                </div>
              ) : savedScripts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-white/60">No saved scripts yet.</p>
                  <p className="text-white/40 text-sm mt-2">Generate or write a script and save it to see it here.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {savedScripts.map((script) => (
                    <div
                      key={script.id}
                      onClick={() => setSelectedSavedScript(script)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedSavedScript?.id === script.id
                          ? 'bg-white/20 border-white/40'
                          : 'bg-black/30 border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-white font-medium text-sm">{script.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-white/60">
                          <span>{script.duration}s</span>
                          <span>{script.isGenerated ? '🤖 AI' : '✍️ Custom'}</span>
                        </div>
                      </div>
                      <p className="text-white/70 text-xs mb-2 line-clamp-2">
                        {script.content.substring(0, 100)}...
                      </p>
                      <div className="flex items-center justify-between text-xs text-white/50">
                        <span>{luxuryTopics.find(t => t.value === script.topic)?.label || script.topic}</span>
                        <span>{new Date(script.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Generated/Custom/Saved Script Display */}
        {(generatedScripts.length > 0 || customScript || selectedSavedScript) && (
          <Card className="mt-8 bg-black/30 backdrop-blur-md border border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Step 1: {scriptMode === 'generate' ? 'Choose Script Version' : 'Your Custom Script'}
                {scriptMode === 'generate' && generatedScripts.length > 1 && (
                  <span className="text-white/60 text-sm font-normal">
                    ({generatedScripts.length} versions generated)
                  </span>
                )}
              </CardTitle>
              {scriptMode === 'generate' && generatedScripts.length > 1 && (
                <p className="text-white/60 text-sm mt-2">
                  Select your preferred script version, then proceed to voice generation
                </p>
              )}
            </CardHeader>
            <CardContent>
              {/* Version Selection for Generated Scripts */}
              {scriptMode === 'generate' && generatedScripts.length > 1 && (
                <div className="mb-6">
                  <Label className="text-white/90 mb-3 block">Choose Script Version</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {generatedScripts.map((_, index) => (
                      <Button
                        key={index}
                        onClick={() => setSelectedScriptIndex(index)}
                        variant={selectedScriptIndex === index ? "default" : "outline"}
                        size="sm"
                        className={
                          selectedScriptIndex === index
                            ? "bg-white/30 hover:bg-white/40 border-white/40 text-white"
                            : "bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/40 text-white"
                        }
                      >
                        Version {index + 1}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-black/50 border border-white/10 p-6 rounded-xl">
                <pre className="whitespace-pre-wrap text-white/90 font-mono text-sm leading-relaxed">
                  {scriptMode === 'generate' 
                    ? generatedScripts[selectedScriptIndex] 
                    : scriptMode === 'custom' 
                      ? customScript
                      : selectedSavedScript?.content
                  }
                </pre>
                <div className="mt-6 pt-4 border-t border-white/10 flex gap-3 flex-wrap">
                  <Button
                    onClick={() => {
                      let script = ''
                      if (scriptMode === 'generate') {
                        script = generatedScripts[selectedScriptIndex]
                      } else if (scriptMode === 'custom') {
                        script = customScript
                      } else if (selectedSavedScript) {
                        script = selectedSavedScript.content
                      }
                      navigator.clipboard.writeText(script)
                    }}
                    variant="outline"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/40 text-white"
                  >
                    Copy Script
                  </Button>
                  {scriptMode !== 'saved' && (
                    <Button
                      onClick={handleSaveScript}
                      size="sm"
                      className="bg-white/20 hover:bg-white/30 border border-white/30 hover:border-white/50 text-white flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save Script
                    </Button>
                  )}
                  {scriptMode === 'generate' && generatedScripts.length > 1 && (
                    <div className="text-white/60 text-xs self-center">
                      Currently viewing Version {selectedScriptIndex + 1} of {generatedScripts.length}
                    </div>
                  )}
                  {scriptMode === 'saved' && selectedSavedScript && (
                    <div className="text-white/60 text-xs self-center">
                      📁 {selectedSavedScript.title} • {selectedSavedScript.isGenerated ? '🤖 AI Generated' : '✍️ Custom'}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Voice Generation Section */}
        {(generatedScripts.length > 0 || customScript) && (
          <Card className="mt-8 bg-black/30 backdrop-blur-md border border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                Step 2: Generate AI Voice
              </CardTitle>
              <p className="text-white/60 text-sm mt-2">
                {scriptMode === 'generate' 
                  ? `Selected: Version ${selectedScriptIndex + 1} of ${generatedScripts.length}`
                  : 'Using your custom script'
                }
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {/* Voice Selection */}
                <div className="grid gap-3">
                  <Label htmlFor="voice" className="text-white/90">Select AI Voice</Label>
                  <select
                    id="voice"
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="bg-black/50 border border-white/20 text-white rounded-xl px-4 py-3 focus:border-white/40 focus:outline-none transition-all duration-200"
                  >
                    {luxuryVoices.map((voice) => (
                      <option key={voice.id} value={voice.id} className="bg-black">
                        {voice.name} - {voice.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Current Selection Summary */}
                <div className="bg-black/30 border border-white/10 p-4 rounded-lg">
                  <h4 className="text-white/90 text-sm font-medium mb-2">Ready to Generate:</h4>
                  <div className="space-y-1 text-xs text-white/70">
                    <div>📝 Script: {scriptMode === 'generate' ? `Version ${selectedScriptIndex + 1}` : 'Custom Script'}</div>
                    <div>🎤 Voice: {luxuryVoices.find(v => v.id === selectedVoice)?.name}</div>
                    <div>⏱️ Duration: {duration} seconds</div>
                  </div>
                </div>

                {/* Generate Voice Button */}
                <Button 
                  onClick={handleGenerateVoice} 
                  disabled={isGeneratingVoice}
                  className="w-full bg-white/20 hover:bg-white/30 border border-white/30 hover:border-white/50 text-white font-medium py-3 rounded-xl transition-all duration-200"
                >
                  {isGeneratingVoice ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Generating Voice...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4" />
                      Generate AI Voice
                    </div>
                  )}
                </Button>

                {/* Audio Player */}
                {audioUrl && (
                  <div className="bg-black/50 border border-white/10 p-6 rounded-xl">
                    <h4 className="text-white/90 text-sm font-medium mb-4 flex items-center gap-2">
                      🎉 Step 3: Your AI Voice is Ready!
                    </h4>
                    <div className="flex items-center gap-4 mb-4">
                      <Button
                        onClick={handlePlayPause}
                        variant="outline"
                        size="sm"
                        className="bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/40 text-white"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {isPlaying ? 'Pause' : 'Play'}
                      </Button>
                      
                      <Button
                        onClick={handleDownloadAudio}
                        variant="outline"
                        size="sm"
                        className="bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/40 text-white"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download MP3
                      </Button>

                      <div className="text-white/70 text-sm">
                        ✅ Voice generated successfully!
                      </div>
                    </div>

                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      onEnded={() => setIsPlaying(false)}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      className="w-full"
                      controls
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Script Modal */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="bg-black/90 border border-white/20 shadow-2xl max-w-md w-full">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Save className="w-5 h-5" />
                  Save Script
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="script-title" className="text-white/90">Script Title</Label>
                    <Input
                      id="script-title"
                      value={saveTitle}
                      onChange={(e) => setSaveTitle(e.target.value)}
                      placeholder="Enter a title for your script..."
                      className="bg-black/50 border border-white/20 text-white rounded-xl px-4 py-3 focus:border-white/40 focus:outline-none transition-all duration-200"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setShowSaveModal(false)}
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/40 text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveToDatabase}
                      disabled={isSaving || !saveTitle.trim()}
                      size="sm"
                      className="flex-1 bg-white/20 hover:bg-white/30 border border-white/30 hover:border-white/50 text-white"
                    >
                      {isSaving ? (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                          Saving...
                        </div>
                      ) : (
                        'Save'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
} 