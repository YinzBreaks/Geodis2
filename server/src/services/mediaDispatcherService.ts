export type MediaAssetType = 'IMAGE' | 'AUDIO_VOICE' | 'AUDIO_MUSIC' | 'NONE';

export interface MediaGenerationConfig {
  assetType: MediaAssetType;
  prompt: string;
  targetOutputDirectory: string;
}

export interface MediaDispatchResult {
  status: 'SUCCESS' | 'OFFLINE_PENDING' | 'ERROR';
  path: string;
  details?: any;
}

export async function dispatchMediaGeneration(
  config: MediaGenerationConfig
): Promise<MediaDispatchResult> {
  const fallbackPath = `${config.targetOutputDirectory}/placeholder.png`;

  let endpointUrl: string | undefined;

  switch (config.assetType) {
    case 'IMAGE':
      endpointUrl = process.env.CLUSTER_IMAGE_GEN_URL;
      break;
    case 'AUDIO_VOICE':
      endpointUrl = process.env.CLUSTER_VOICE_GEN_URL;
      break;
    case 'AUDIO_MUSIC':
      endpointUrl = process.env.CLUSTER_MUSIC_GEN_URL;
      break;
    case 'NONE':
    default:
      return {
        status: 'SUCCESS',
        path: '',
        details: 'No asset generation required for NONE type.',
      };
  }

  if (!endpointUrl) {
    console.warn(
      `[MediaDispatcher] No cluster endpoint URL configured for ${config.assetType}. Falling back to offline placeholder.`
    );
    return {
      status: 'OFFLINE_PENDING',
      path: fallbackPath,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const payload = {
      prompt: config.prompt,
      targetOutputDirectory: config.targetOutputDirectory,
    };

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Cluster media endpoint returned status ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    return {
      status: 'SUCCESS',
      path: data.outputPath || `${config.targetOutputDirectory}/asset_${Date.now()}`,
      details: data,
    };
  } catch (error: any) {
    console.error(
      `[MediaDispatcher] Media generation request failed for assetType: ${config.assetType}. Reason:`,
      error.message || error
    );
    return {
      status: 'OFFLINE_PENDING',
      path: fallbackPath,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
