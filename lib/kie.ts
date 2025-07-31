export type AspectRatio = '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '16:21';
export type OutputFormat = 'jpeg' | 'png';
export type FluxModel = 'flux-kontext-pro' | 'flux-kontext-max';
export type SafetyTolerance = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type VideoAspectRatio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
export type VideoQuality = '720p' | '1080p';
export type VideoDuration = 5 | 8;

export interface FluxGenerateRequest {
  prompt: string;
  enableTranslation?: boolean;
  uploadCn?: boolean;
  inputImage?: string;
  aspectRatio?: AspectRatio;
  outputFormat?: OutputFormat;
  promptUpsampling?: boolean;
  model?: FluxModel;
  callBackUrl?: string;
  safetyTolerance?: SafetyTolerance;
  watermark?: string;
}

export interface FluxGenerateResponse {
  code: 200 | 401 | 402 | 404 | 422 | 429 | 455 | 500 | 501 | 505;
  msg: string;
  data?: {
    taskId: string;
    info?: {
      originImageUrl?: string;
      resultImageUrl?: string;
    };
  };
}

export interface VideoGenerateRequest {
  prompt: string;
  duration: VideoDuration;
  quality: VideoQuality;
  aspectRatio: VideoAspectRatio;
  imageUrl?: string;
  waterMark?: string;
  callBackUrl: string;
}

export interface VideoGenerateResponse {
  code: 200 | 401 | 404 | 422 | 451 | 455 | 500;
  msg: string;
  data?: {
    taskId: string;
  };
}

export interface FluxCallbackData {
  code: 200 | 400 | 500 | 501;
  msg: string;
  data: {
    taskId: string;
    info?: {
      originImageUrl?: string;
      resultImageUrl?: string;
    };
  };
}

export interface VideoCallbackData {
  code: 200 | 400 | 500;
  msg: string;
  data: {
    task_id: string;
    video_id?: string;
    video_url?: string;
    image_url?: string;
  };
}

export class KieApiError extends Error {
  public code: number;
  public originalMessage: string;

  constructor(code: number, message: string) {
    super(`KIE API Error ${code}: ${message}`);
    this.code = code;
    this.originalMessage = message;
    this.name = 'KieApiError';
  }
}

export class KieApi {
  private apiKey: string;
  private baseUrl = 'https://api.kie.ai/api/v1';
  private callbackBaseUrl: string;

  constructor(apiKey?: string, callbackBaseUrl?: string) {
    this.apiKey = apiKey || process.env.KIE_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('API key is required. Provide it as parameter or set KIE_API_KEY environment variable');
    }
    
    // Use provided callback URL, prioritizing tunnel URL for development
    this.callbackBaseUrl = callbackBaseUrl || 
                          process.env.TUNNEL_URL ||
                          process.env.NEXT_PUBLIC_BASE_URL || 
                          process.env.NEXTAUTH_URL || 
                          'http://localhost:3000';
    
    console.log('🔗 KIE API will use callback base URL:', this.callbackBaseUrl);
  }

  private async makeRequest<T>(endpoint: string, data: FluxGenerateRequest | VideoGenerateRequest): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.code !== 200) {
        throw new KieApiError(result.code, result.msg);
      }

      return result as T;
    } catch (error) {
      if (error instanceof KieApiError) {
        throw error;
      }
      throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateImage(params: FluxGenerateRequest): Promise<FluxGenerateResponse> {
    // Auto-set callback URL if not provided
    if (!params.callBackUrl) {
      params.callBackUrl = `${this.callbackBaseUrl}/api/kie-callback/image`;
    }
    
    // Warn if using localhost URL
    if (params.callBackUrl.includes('localhost') || params.callBackUrl.includes('127.0.0.1')) {
      console.warn('⚠️  Using localhost callback URL - KIE API callbacks will not work!');
      console.warn('🔗 Please set up Cloudflare Tunnel or ngrok for public HTTPS access');
      console.warn('📖 See: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/');
    }
    
    console.log('📞 Image generation callback URL:', params.callBackUrl);
    this.validateImageParams(params);
    return this.makeRequest<FluxGenerateResponse>('/flux/kontext/generate', params);
  }

  async editImage(params: FluxGenerateRequest & { inputImage: string }): Promise<FluxGenerateResponse> {
    if (!params.inputImage) {
      throw new Error('inputImage is required for image editing');
    }
    // Auto-set callback URL if not provided
    if (!params.callBackUrl) {
      params.callBackUrl = `${this.callbackBaseUrl}/api/kie-callback/image`;
    }
    this.validateImageParams(params);
    return this.makeRequest<FluxGenerateResponse>('/flux/kontext/generate', params);
  }

  async generateVideo(params: VideoGenerateRequest): Promise<VideoGenerateResponse> {
    // Auto-set callback URL if not provided
    if (!params.callBackUrl) {
      params.callBackUrl = `${this.callbackBaseUrl}/api/kie-callback/video`;
    }
    
    // Warn if using localhost URL
    if (params.callBackUrl.includes('localhost') || params.callBackUrl.includes('127.0.0.1')) {
      console.warn('⚠️  Using localhost callback URL - KIE API callbacks will not work!');
      console.warn('🔗 Please set up Cloudflare Tunnel or ngrok for public HTTPS access');
    }
    
    console.log('📞 Video generation callback URL:', params.callBackUrl);
    this.validateVideoParams(params);
    return this.makeRequest<VideoGenerateResponse>('/runway/generate', params);
  }

  private validateImageParams(params: FluxGenerateRequest): void {
    if (!params.prompt || params.prompt.trim().length === 0) {
      throw new Error('Prompt is required and cannot be empty');
    }

    if (params.prompt.length > 1800) {
      throw new Error('Prompt cannot exceed 1800 characters');
    }

    if (params.safetyTolerance !== undefined) {
      const maxTolerance = params.inputImage ? 2 : 6;
      if (params.safetyTolerance < 0 || params.safetyTolerance > maxTolerance) {
        throw new Error(`Safety tolerance must be between 0 and ${maxTolerance} for ${params.inputImage ? 'image editing' : 'image generation'}`);
      }
    }

    if (params.inputImage && !this.isValidUrl(params.inputImage)) {
      throw new Error('inputImage must be a valid URL');
    }

    if (params.callBackUrl && !this.isValidUrl(params.callBackUrl)) {
      throw new Error('callBackUrl must be a valid URL');
    }
  }

  private validateVideoParams(params: VideoGenerateRequest): void {
    if (!params.prompt || params.prompt.trim().length === 0) {
      throw new Error('Prompt is required and cannot be empty');
    }

    if (params.prompt.length > 1800) {
      throw new Error('Prompt cannot exceed 1800 characters');
    }

    if (!params.callBackUrl) {
      throw new Error('callBackUrl is required for video generation');
    }

    if (!this.isValidUrl(params.callBackUrl)) {
      throw new Error('callBackUrl must be a valid URL');
    }

    if (params.duration === 8 && params.quality === '1080p') {
      throw new Error('8-second videos cannot use 1080p quality');
    }

    if (params.imageUrl && !this.isValidUrl(params.imageUrl)) {
      throw new Error('imageUrl must be a valid URL');
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static getErrorMessage(code: number): string {
    const errorMessages: Record<number, string> = {
      401: 'Unauthorized - Authentication credentials are missing or invalid',
      402: 'Insufficient Credits - Account does not have enough credits',
      404: 'Not Found - The requested resource or endpoint does not exist',
      422: 'Validation Error - The request parameters failed validation checks',
      429: 'Rate Limited - Request limit has been exceeded',
      451: 'Unauthorized - Failed to fetch the image. Verify access limits',
      455: 'Service Unavailable - System is currently undergoing maintenance',
      500: 'Server Error - An unexpected error occurred',
      501: 'Generation Failed - Image/video generation task failed',
      505: 'Feature Disabled - The requested feature is currently disabled',
    };

    return errorMessages[code] || `Unknown error code: ${code}`;
  }
}

export function createKieClient(apiKey?: string, callbackBaseUrl?: string): KieApi {
  return new KieApi(apiKey, callbackBaseUrl);
}

export default KieApi;