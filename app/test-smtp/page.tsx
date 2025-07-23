'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface EmailResult {
  success: boolean;
  message?: string;
  error?: string;
  details?: string;
  data?: {
    messageId?: string;
    response?: string;
    smtpConnection?: string;
  };
  diagnostics?: {
    domain?: string;
    fromEmail?: string;
    fromName?: string;
    smtpUser?: string;
    userMatchesSender?: boolean;
    requiredDNSRecords?: {
      spf: string;
      dmarc: string;
      mx: string;
    };
    troubleshooting?: string[];
  };
}

export default function TestSMTPPage() {
  const [formData, setFormData] = useState({
    to: 'prodancristianbusiness@gmail.com',
    subject: 'Test Email from Vidsreels (Google SMTP)',
    html: '<p>Hello! This is a test email from Vidsreels using Google SMTP. It works!</p>',
    includeAvatar: false,
    avatarUrl: 'https://github.com/shadcn.png'
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EmailResult | null>(null);

  const sendTestEmail = async (useForm = false) => {
    setLoading(true);
    setResult(null);

    try {
      let response;
      
      if (useForm) {
        // Use POST with form data
        response = await fetch('/api/test-smtp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      } else {
        // Use GET with default values
        response = await fetch('/api/test-smtp', {
          method: 'GET',
        });
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: 'Network error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Test Google SMTP
                <Badge variant="secondary">Google Workspace</Badge>
              </CardTitle>
              <CardDescription>
                Test your Google Workspace SMTP configuration with smtp.gmail.com
              </CardDescription>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>📧 smtp.gmail.com:587</p>
              <p>🔐 STARTTLS</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuration Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">📋 Required Configuration</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• <strong>SMTP_USER:</strong> your-email@yourdomain.com</p>
              <p>• <strong>SMTP_PASS:</strong> Your Google App Password</p>
              <p>• <strong>SMTP_FROM_EMAIL:</strong> your-email@yourdomain.com</p>
            </div>
          </div>

          {/* Quick Test Button */}
          <div className="space-y-2">
            <Label>Quick SMTP Test</Label>
            <Button 
              onClick={() => sendTestEmail(false)}
              disabled={loading}
              className="w-full"
              variant="default"
            >
              {loading ? 'Testing SMTP Connection...' : '🚀 Send Google SMTP Test Email'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Tests SMTP connection and sends email with default content and avatar
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or customize your test
              </span>
            </div>
          </div>

          {/* Custom Email Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="to">To Email</Label>
              <Input
                id="to"
                type="email"
                value={formData.to}
                onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                placeholder="recipient@example.com"
              />
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Email subject"
              />
            </div>

            <div>
              <Label htmlFor="html">HTML Content</Label>
              <Textarea
                id="html"
                value={formData.html}
                onChange={(e) => setFormData({ ...formData, html: e.target.value })}
                placeholder="<p>Your HTML content here</p>"
                rows={4}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includeAvatar"
                  checked={formData.includeAvatar}
                  onChange={(e) => setFormData({ ...formData, includeAvatar: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="includeAvatar">Include Avatar Image</Label>
              </div>
              
              {formData.includeAvatar && (
                <div>
                  <Label htmlFor="avatarUrl">Avatar Image URL</Label>
                  <Input
                    id="avatarUrl"
                    value={formData.avatarUrl}
                    onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                    placeholder="https://example.com/avatar.jpg"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use a publicly accessible image URL (JPG, PNG, GIF)
                  </p>
                </div>
              )}
            </div>

            <Button 
              onClick={() => sendTestEmail(true)}
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              {loading ? 'Sending via Google SMTP...' : '📤 Send Custom Email via SMTP'}
            </Button>
          </div>

          {/* Result Display */}
          {result && (
            <Card className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <CardHeader>
                <CardTitle className={result.success ? 'text-green-700' : 'text-red-700'}>
                  {result.success ? '✅ Success - Email Sent!' : '❌ Error - Email Failed'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p><strong>Message:</strong> {result.message || result.error}</p>
                  {result.details && (
                    <p><strong>Details:</strong> {result.details}</p>
                  )}
                  {result.data && (
                    <div className="space-y-2">
                      {result.data.messageId && (
                        <p><strong>Message ID:</strong> <code className="text-xs bg-gray-100 px-2 py-1 rounded">{result.data.messageId}</code></p>
                      )}
                      {result.data.smtpConnection && (
                        <p><strong>SMTP Status:</strong> {result.data.smtpConnection}</p>
                      )}
                      {result.data.response && (
                        <div>
                          <strong>SMTP Response:</strong>
                          <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-auto">
                            {result.data.response}
                          </pre>
                        </div>
                                             )}
                     </div>
                   )}
                   
                   {/* Diagnostics Section */}
                   {result.diagnostics && (
                     <Card className="bg-blue-50 border-blue-200 mt-4">
                       <CardHeader>
                         <CardTitle className="text-blue-800 text-sm">🔍 Email Configuration Diagnostics</CardTitle>
                       </CardHeader>
                       <CardContent className="space-y-3 text-sm">
                         <div className="grid grid-cols-2 gap-2">
                           <p><strong>Domain:</strong> {result.diagnostics.domain}</p>
                           <p><strong>From Email:</strong> {result.diagnostics.fromEmail}</p>
                           <p><strong>SMTP User:</strong> {result.diagnostics.smtpUser}</p>
                           <p className={result.diagnostics.userMatchesSender ? 'text-green-600' : 'text-red-600'}>
                             <strong>User/Sender Match:</strong> {result.diagnostics.userMatchesSender ? '✅ Yes' : '❌ No'}
                           </p>
                         </div>
                         
                         {!result.diagnostics.userMatchesSender && (
                           <div className="bg-yellow-100 border border-yellow-300 rounded p-2">
                             <p className="text-yellow-800 font-semibold">⚠️ Configuration Issue</p>
                             <p className="text-yellow-700 text-xs">
                               Your SMTP_USER should match SMTP_FROM_EMAIL for proper sender authentication.
                             </p>
                           </div>
                         )}
                         
                         {result.diagnostics.requiredDNSRecords && (
                           <div>
                             <h4 className="font-semibold text-blue-800 mb-2">Required DNS Records for {result.diagnostics.domain}:</h4>
                             <div className="space-y-1 text-xs">
                               <p><strong>SPF:</strong> <code className="bg-gray-100 px-1 rounded">{result.diagnostics.requiredDNSRecords.spf}</code></p>
                               <p><strong>MX:</strong> <code className="bg-gray-100 px-1 rounded">{result.diagnostics.requiredDNSRecords.mx}</code></p>
                               <p><strong>DMARC:</strong> <code className="bg-gray-100 px-1 rounded">{result.diagnostics.requiredDNSRecords.dmarc}</code></p>
                             </div>
                           </div>
                         )}
                       </CardContent>
                     </Card>
                   )}
                 </div>
               </CardContent>
             </Card>
           )}

          {/* Setup Instructions */}
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="text-yellow-800">🔧 Setup Instructions to Fix &quot;Anonymous&quot; Sender</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-yellow-700 space-y-3">
              <div>
                <p className="font-semibold mb-1">✅ Google Workspace Configuration:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Verify domain ownership in Google Workspace Admin Console</li>
                  <li>Generate App Password (not your regular password)</li>
                  <li>Enable 2-Step Verification (required for App Passwords)</li>
                  <li>Ensure SMTP_USER matches your verified workspace email</li>
                </ul>
              </div>
              
              <div>
                <p className="font-semibold mb-1">🌐 DNS Configuration Required:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Add SPF record: <code className="bg-yellow-100 px-1">v=spf1 include:_spf.google.com ~all</code></li>
                  <li>Add MX record: <code className="bg-yellow-100 px-1">1 smtp.google.com.</code></li>
                  <li>Enable DKIM signing in Google Workspace</li>
                  <li>Add DMARC policy for better deliverability</li>
                </ul>
              </div>
              
                              <div className="bg-red-100 border border-red-300 rounded p-2">
                  <p className="text-red-800 font-semibold">🚨 Common Issue:</p>
                  <p className="text-red-700 text-xs">
                    If emails show as &quot;anonymous&quot;, your domain likely isn&apos;t properly verified in Google Workspace or missing DNS records.
                  </p>
                </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
} 