import { useState, useCallback } from 'react';

export interface PollingOptions {
  interval?: number;
  maxAttempts?: number;
  onSuccess?: (data: unknown) => void;
  onError?: (error: unknown) => void;
  onMaxAttemptsReached?: () => void;
}

export function usePolling(
  url: string | null,
  options: PollingOptions = {}
) {
  const {
    interval = 2000,
    maxAttempts = 30,
    onSuccess,
    onError,
    onMaxAttemptsReached
  } = options;

  const [isPolling, setIsPolling] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<unknown>(null);

  const poll = useCallback(async () => {
    if (!url) return;

    try {
      const response = await fetch(url);
      
      if (response.status === 202) {
        // Still pending, continue polling
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
      setIsPolling(false);
      onSuccess?.(result);
      return result;
      
    } catch (err) {
      console.error('Polling error:', err);
      setError(err);
      setIsPolling(false);
      onError?.(err);
      return null;
    }
  }, [url, onSuccess, onError]);

  const startPolling = useCallback(() => {
    if (!url || isPolling) return;
    
    setIsPolling(true);
    setAttempts(0);
    setData(null);
    setError(null);
    
    const pollInterval = setInterval(async () => {
      setAttempts(prev => {
        const newAttempts = prev + 1;
        
        if (newAttempts >= maxAttempts) {
          clearInterval(pollInterval);
          setIsPolling(false);
          onMaxAttemptsReached?.();
          return newAttempts;
        }
        
        return newAttempts;
      });
      
      const result = await poll();
      if (result !== null) {
        clearInterval(pollInterval);
      }
    }, interval);

    return () => clearInterval(pollInterval);
  }, [url, isPolling, interval, maxAttempts, poll, onMaxAttemptsReached]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  return {
    isPolling,
    attempts,
    data,
    error,
    startPolling,
    stopPolling
  };
}

// Utility function to poll for image results
export async function pollImageResult(taskId: string): Promise<unknown> {
  const maxAttempts = 30;
  const interval = 2000;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`/api/kie-callback/image?taskId=${encodeURIComponent(taskId)}`);
      
      if (response.status === 202) {
        // Still pending, wait and try again
        await new Promise(resolve => setTimeout(resolve, interval));
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error(`Image polling attempt ${attempt + 1} failed:`, error);
      
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  throw new Error('Max polling attempts reached for image result');
}

// Utility function to poll for video results
export async function pollVideoResult(taskId: string): Promise<unknown> {
  const maxAttempts = 60; // Videos take longer, so more attempts
  const interval = 3000;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`/api/kie-callback/video?taskId=${encodeURIComponent(taskId)}`);
      
      if (response.status === 202) {
        // Still pending, wait and try again
        await new Promise(resolve => setTimeout(resolve, interval));
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error(`Video polling attempt ${attempt + 1} failed:`, error);
      
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  throw new Error('Max polling attempts reached for video result');
}