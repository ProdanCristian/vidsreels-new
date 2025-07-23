'use client';

import { useState, useRef, FormEvent, ChangeEvent } from 'react';

interface Message {
  role: 'user' | 'model' | 'error';
  text: string;
}

export default function TestGeminiPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !file) return;

    const userMessage = input.trim() || `Video: ${file?.name}`;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    const formData = new FormData();
    formData.append('prompt', input.trim());
    if (file) {
      formData.append('video', file);
    }

    // Reset inputs after preparing FormData
    setInput('');
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'An unknown error occurred.');
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'model', text: data.text }]);
    } catch (err: unknown) {
      setMessages(prev => [
        ...prev,
        { role: 'error', text: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Gemini Chat</h1>
      <p style={styles.subHeader}>
        Send a text prompt or upload a video for analysis.
      </p>
      <div style={styles.chatWindow}>
        {messages.map((msg, index) => (
          <div key={index} style={styles.messageRow}>
            <div
              style={{
                ...styles.message,
                ...(msg.role === 'user' ? styles.userMessage : {}),
                ...(msg.role === 'model' ? styles.modelMessage : {}),
                ...(msg.role === 'error' ? styles.errorMessage : {}),
              }}
            >
              <strong style={{ textTransform: 'capitalize' }}>{msg.role}: </strong>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={styles.messageRow}>
            <div style={{ ...styles.message, ...styles.modelMessage }}>
              <strong>model: </strong>Thinking...
            </div>
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your message..."
          style={styles.input}
          disabled={isLoading}
        />
        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          ref={fileInputRef}
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={styles.button}
          disabled={isLoading}
        >
          Upload Video
        </button>
        <button type="submit" style={styles.button} disabled={isLoading || (!input.trim() && !file)}>
          Send
        </button>
      </form>
      {file && <p style={styles.fileName}>Selected: {file.name}</p>}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2rem',
    fontFamily: 'sans-serif',
    display: 'flex',
    flexDirection: 'column',
    height: '90vh',
  },
  header: { textAlign: 'center' },
  subHeader: { textAlign: 'center', color: '#666', marginTop: '-1rem' },
  chatWindow: {
    flexGrow: 1,
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
    overflowY: 'auto',
    backgroundColor: '#f9f9f9',
  },
  messageRow: {
    display: 'flex',
    marginBottom: '0.5rem',
  },
  message: {
    padding: '0.5rem 1rem',
    borderRadius: '1rem',
    maxWidth: '80%',
    wordBreak: 'break-word',
  },
  userMessage: {
    backgroundColor: '#007bff',
    color: 'white',
    marginLeft: 'auto',
  },
  modelMessage: {
    backgroundColor: '#e9ecef',
    color: 'black',
    marginRight: 'auto',
  },
  errorMessage: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    marginRight: 'auto',
  },
  form: {
    display: 'flex',
    gap: '0.5rem',
  },
  input: {
    flexGrow: 1,
    padding: '0.75rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '1rem',
  },
  button: {
    padding: '0.75rem 1.5rem',
    border: 'none',
    backgroundColor: '#007bff',
    color: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  fileName: {
    textAlign: 'center',
    color: '#555',
    marginTop: '0.5rem',
  },
}; 