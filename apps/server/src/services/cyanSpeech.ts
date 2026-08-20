import { ReadableStream } from 'node:stream/web';

import WebSocket from 'ws';

const firstEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
};

const getASRConfig = () => ({
  apiKey: firstEnv('CYAN_SPEECH_ASR_API_KEY', 'SPEECH_ASR_API_KEY'),
  baseURL: firstEnv('CYAN_SPEECH_ASR_BASE_URL', 'SPEECH_ASR_BASE_URL'),
  model: firstEnv('CYAN_SPEECH_ASR_MODEL', 'SPEECH_ASR_MODEL') || 'FunAudioLLM/SenseVoiceSmall',
});

const getTTSConfig = () => ({
  apiKey: firstEnv('CYAN_SPEECH_TTS_API_KEY', 'SPEECH_TTS_API_KEY'),
  baseURL: firstEnv('CYAN_SPEECH_TTS_BASE_URL', 'SPEECH_TTS_BASE_URL'),
  model: firstEnv('CYAN_SPEECH_TTS_MODEL', 'SPEECH_TTS_MODEL') || 'speech-2.8-hd',
  responseFormat:
    firstEnv('CYAN_SPEECH_TTS_RESPONSE_FORMAT', 'SPEECH_TTS_RESPONSE_FORMAT') || 'mp3',
  voice: firstEnv('CYAN_SPEECH_TTS_VOICE', 'SPEECH_TTS_VOICE') || 'male-qn-qingse',
});

export const hasCyanTTSConfig = () => {
  const config = getTTSConfig();
  return Boolean(config.baseURL && config.apiKey && config.model);
};

export const transcribeByCyanSpeech = async (file: File) => {
  const config = getASRConfig();
  if (!config.baseURL || !config.apiKey || !config.model) {
    throw new Error('语音识别配置不完整');
  }

  const formData = new FormData();
  formData.append('model', config.model);
  formData.append('file', file, file.name || 'speech.webm');

  const response = await fetch(config.baseURL, {
    body: formData,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
    method: 'POST',
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`ASR请求失败: ${extractSpeechError(text)}`);
  }

  const result = JSON.parse(text) as { text?: string };
  return result.text?.trim() || '';
};

export const synthesizeByCyanSpeech = (text: string) => {
  const config = getTTSConfig();
  if (!config.baseURL || !config.apiKey || !config.model) {
    throw new Error('语音播报配置不完整');
  }

  const format = config.responseFormat.toLowerCase();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const socket = new WebSocket(config.baseURL!, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      });

      let taskStarted = false;
      let closed = false;

      const closeWithError = (error: unknown) => {
        if (closed) return;
        closed = true;
        controller.error(error instanceof Error ? error : new Error(String(error)));
        socket.close();
      };

      socket.on('open', () => {
        taskStarted = false;
      });

      socket.on('message', (raw) => {
        try {
          const message = JSON.parse(raw.toString()) as {
            base_resp?: { status_code?: number; status_msg?: string };
            data?: { audio?: string };
            event?: string;
            is_final?: boolean;
          };

          if (message.base_resp?.status_code) {
            closeWithError(
              new Error(
                `TTS响应失败: ${message.base_resp.status_msg || message.base_resp.status_code}`,
              ),
            );
            return;
          }

          if (message.event === 'connected_success') {
            socket.send(
              JSON.stringify({
                audio_setting: {
                  bitrate: 128_000,
                  channel: 1,
                  format,
                  sample_rate: 32_000,
                },
                event: 'task_start',
                model: config.model,
                voice_setting: {
                  english_normalization: false,
                  pitch: 0,
                  speed: 1,
                  voice_id: config.voice,
                  vol: 1,
                },
              }),
            );
            return;
          }

          if (message.event === 'task_started' && !taskStarted) {
            taskStarted = true;
            socket.send(JSON.stringify({ event: 'task_continue', text }));
            return;
          }

          if (message.data?.audio) {
            controller.enqueue(Buffer.from(message.data.audio, 'hex'));
          }

          if (message.is_final) {
            closed = true;
            socket.send(JSON.stringify({ event: 'task_finish' }));
            socket.close();
            controller.close();
          }
        } catch (error) {
          closeWithError(error);
        }
      });

      socket.on('error', closeWithError);
      socket.on('close', () => {
        if (!closed) closeWithError(new Error('TTS连接提前关闭'));
      });
    },
  });

  return {
    contentType: speechContentType(format),
    stream,
  };
};

const speechContentType = (format: string) => {
  switch (format) {
    case 'wav': {
      return 'audio/wav';
    }
    case 'ogg': {
      return 'audio/ogg';
    }
    default: {
      return 'audio/mpeg';
    }
  }
};

const extractSpeechError = (body: string) => {
  const trimmed = body.trim();
  if (!trimmed) return '空响应';

  try {
    const result = JSON.parse(trimmed) as { error?: { message?: string }; message?: string };
    return result.message || result.error?.message || trimmed;
  } catch {
    return trimmed;
  }
};
