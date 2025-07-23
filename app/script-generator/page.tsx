"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import DashboardHeader from '@/components/dashboard-header'

export default function ScriptGeneratorPage() {
  const [videoTopic, setVideoTopic] = useState('')
  const [videoType, setVideoType] = useState('promotional')
  const [duration, setDuration] = useState('30')
  const [tone, setTone] = useState('professional')
  const [targetAudience, setTargetAudience] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [generatedScript, setGeneratedScript] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleGenerateScript = async () => {
    if (!videoTopic) return
    setIsLoading(true)
    setGeneratedScript('')

    // Construct a detailed prompt for video voiceover
    const prompt = `Create a ${duration}-second voiceover script for a ${videoType} video about "${videoTopic}".

Video Details:
- Type: ${videoType}
- Duration: ${duration} seconds
- Tone: ${tone}
- Target Audience: ${targetAudience || 'General audience'}
- Additional Notes: ${additionalNotes || 'None'}

Requirements:
- Write a natural, engaging voiceover script
- Include timing cues and pauses where appropriate
- Make it suitable for ${tone} tone
- Keep it exactly ${duration} seconds when read at normal pace (approximately 150-160 words per minute)
- Add [PAUSE] markers for natural breaks
- Include emotional cues in brackets like [excited], [confident], [warm]
- Format it clearly for a voice actor to read

Please create a compelling script that flows naturally and matches the specified requirements.`

    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      })

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setGeneratedScript((prev) => prev + chunk)
      }
    } catch (error) {
      console.error('Error generating script:', error)
      setGeneratedScript('Failed to generate script. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <DashboardHeader />
      <div className="container mx-auto px-4 py-8 pt-28">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Video Voiceover Script Generator</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="topic">Video Topic/Subject</Label>
                <Input
                  id="topic"
                  value={videoTopic}
                  onChange={(e) => setVideoTopic(e.target.value)}
                  placeholder="e.g., Luxury watch collection, Travel to Paris, Product launch..."
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Video Type</Label>
                  <select
                    id="type"
                    value={videoType}
                    onChange={(e) => setVideoType(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white rounded-md px-3 py-2 border"
                  >
                    <option value="promotional">Promotional</option>
                    <option value="educational">Educational</option>
                    <option value="tutorial">Tutorial</option>
                    <option value="documentary">Documentary</option>
                    <option value="commercial">Commercial</option>
                    <option value="social-media">Social Media</option>
                    <option value="explainer">Explainer</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="duration">Duration (seconds)</Label>
                  <select
                    id="duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white rounded-md px-3 py-2 border"
                  >
                    <option value="15">15 seconds</option>
                    <option value="30">30 seconds</option>
                    <option value="60">1 minute</option>
                    <option value="90">1.5 minutes</option>
                    <option value="120">2 minutes</option>
                    <option value="180">3 minutes</option>
                    <option value="300">5 minutes</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="tone">Tone</Label>
                  <select
                    id="tone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white rounded-md px-3 py-2 border"
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="enthusiastic">Enthusiastic</option>
                    <option value="authoritative">Authoritative</option>
                    <option value="friendly">Friendly</option>
                    <option value="dramatic">Dramatic</option>
                    <option value="conversational">Conversational</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="audience">Target Audience</Label>
                <Input
                  id="audience"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g., Young professionals, Luxury enthusiasts, Tech-savvy consumers..."
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Additional Notes/Requirements</Label>
                <Textarea
                  id="notes"
                  value={additionalNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAdditionalNotes(e.target.value)}
                  placeholder="Any specific requirements, key points to mention, call-to-action, etc..."
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <Button onClick={handleGenerateScript} disabled={isLoading || !videoTopic}>
                {isLoading ? 'Generating Script...' : 'Generate Voiceover Script'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {generatedScript && (
          <Card className="mt-8 bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Generated Voiceover Script</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-800 p-6 rounded-md">
                <pre className="whitespace-pre-wrap text-white font-mono text-sm leading-relaxed">
                  {generatedScript}
                </pre>
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <Button
                    onClick={() => navigator.clipboard.writeText(generatedScript)}
                    variant="outline"
                    size="sm"
                  >
                    Copy Script
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 