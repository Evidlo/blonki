// OpenAI service for API calls
export interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface OpenAIModelsResponse {
  object: string;
  data: OpenAIModel[];
}

export interface OpenAICompletionRequest {
  model: string;
  prompt: string;
  max_tokens?: number;
  temperature?: number;
}

export interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    text: string;
    index: number;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIChatCompletionRequest {
  model: string;
  messages: OpenAIChatMessage[];
  max_tokens?: number;
  temperature?: number;
  response_format?: {
    type: 'json_object';
  };
}

export interface OpenAIChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    index: number;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIService {
  private endpoint: string;
  private apiKey: string;

  constructor(endpoint: string, apiKey: string) {
    this.endpoint = endpoint.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.endpoint}/v1/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: OpenAIModelsResponse = await response.json();
      return data.data.map(model => model.id);
    } catch (error) {
      console.error('Failed to list models:', error);
      throw new Error(`Failed to list models: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createCompletion(request: OpenAICompletionRequest): Promise<string> {
    try {
      const response = await fetch(`${this.endpoint}/v1/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model,
          prompt: request.prompt,
          max_tokens: request.max_tokens || 1000,
          temperature: request.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: OpenAICompletionResponse = await response.json();
      return data.choices[0]?.text || '';
    } catch (error) {
      console.error('Failed to create completion:', error);
      throw new Error(`Failed to create completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createChatCompletion(request: OpenAIChatCompletionRequest): Promise<string> {
    try {
      const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          max_tokens: request.max_tokens || 2000,
          temperature: request.temperature || 0.7,
          response_format: request.response_format,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: OpenAIChatCompletionResponse = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Failed to create chat completion:', error);
      throw new Error(`Failed to create chat completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Test connection to verify endpoint and API key
  async testConnection(): Promise<boolean> {
    try {
      await this.listModels();
      return true;
    } catch (error) {
      return false;
    }
  }
}
