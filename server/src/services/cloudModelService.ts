import { DEEPSEEK_DECONSTRUCTION_SYSTEM_PROMPT } from './promptStore';
import { WorkspaceAudience, DeconstructionPipelineResponse } from '../types/pipeline';

export interface CloudModelOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_PRIMARY_MODEL = 'anthropic/claude-3.5-sonnet';
const DEFAULT_FALLBACK_MODEL = 'meta-llama/llama-3.1-405b-instruct';

export async function forwardToCloudModel(
  prompt: string,
  audience: WorkspaceAudience,
  options?: CloudModelOptions
): Promise<DeconstructionPipelineResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Missing cloud API key. Please configure OPENROUTER_API_KEY (or ANTHROPIC_API_KEY) in your environment.'
    );
  }

  // Model selection: default to Claude 3.5 Sonnet, with configurable options
  const targetModel = options?.model || DEFAULT_PRIMARY_MODEL;

  const userContent = JSON.stringify({
    rawIdea: prompt,
    audienceMode: audience,
  });

  const requestBody = {
    model: targetModel,
    messages: [
      {
        role: 'system',
        content: DEEPSEEK_DECONSTRUCTION_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: `Target Audience Mode: "${audience}". Project Proposal / Idea:\n${prompt}\n\nPlease analyze and deconstruct strictly adhering to the specified JSON schema. Payload:\n${userContent}`,
      },
    ],
    response_format: {
      type: 'json_object',
    },
    temperature: options?.temperature ?? 0.2,
    max_tokens: options?.maxTokens ?? 4000,
  };

  const controller = new AbortController();
  const timeoutMs = 60000; // 60s timeout
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://promptorganizer.app',
        'X-Title': 'PromptOrganizer SaaS Architecture Engine',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsedError: any;
      try {
        parsedError = JSON.parse(errorText);
      } catch {
        parsedError = errorText;
      }

      // Handle specific HTTP statuses (rate limiting, auth, provider downtime)
      if (response.status === 429) {
        throw new Error('Cloud model rate limit reached. Please wait a moment before trying again.');
      } else if (response.status === 401 || response.status === 403) {
        throw new Error('Cloud provider authentication failed. Check your API key.');
      }

      throw new Error(
        `Cloud model API error (${response.status}): ${
          typeof parsedError === 'object' ? JSON.stringify(parsedError) : parsedError
        }`
      );
    }

    const jsonResponse: any = await response.json();

    let rawOutputContent: string | undefined;
    if (jsonResponse?.choices?.[0]?.message?.content) {
      rawOutputContent = jsonResponse.choices[0].message.content;
    } else if (typeof jsonResponse === 'string') {
      rawOutputContent = jsonResponse;
    } else if (jsonResponse?.pipelineId && jsonResponse?.steps) {
      return jsonResponse as DeconstructionPipelineResponse;
    }

    if (!rawOutputContent) {
      throw new Error('Cloud model returned empty or unexpected completion structure.');
    }

    // Clean any accidental markdown wrap
    const cleanedContent = rawOutputContent
      .trim()
      .replace(/^```(json)?/i, '')
      .replace(/```$/i, '')
      .trim();

    const parsedData: DeconstructionPipelineResponse = JSON.parse(cleanedContent);

    if (!parsedData || !Array.isArray(parsedData.steps)) {
      throw new Error('Cloud model response lacks required "steps" array structure.');
    }

    return parsedData;
  } catch (error: any) {
    console.error(`[CloudModelService] Error querying cloud model ${targetModel}:`, error.message || error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Retain alias export for backwards compatibility
export const forwardToDeepSeek = forwardToCloudModel;
