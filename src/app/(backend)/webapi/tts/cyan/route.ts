import { type OpenAITTSPayload } from '@lobehub/tts';
import { createOpenaiAudioSpeech } from '@lobehub/tts/server';

import { createBizOpenAI } from '@/app/(backend)/_deprecated/createBizOpenAI';
import { hasCyanTTSConfig, synthesizeByCyanSpeech } from '@/server/services/cyanSpeech';
import { createSpeechResponse } from '@/server/utils/createSpeechResponse';

export const POST = async (req: Request) => {
  const payload = (await req.json()) as OpenAITTSPayload;

  if (!hasCyanTTSConfig()) {
    const openaiOrErrResponse = createBizOpenAI(req);
    if (openaiOrErrResponse instanceof Response) return openaiOrErrResponse;

    return createSpeechResponse(
      () =>
        createOpenaiAudioSpeech({
          openai: openaiOrErrResponse as any,
          payload,
        }),
      {
        logTag: 'webapi/tts/cyan/openai-fallback',
        messages: {
          failure: 'Failed to synthesize speech',
          invalid: 'Unexpected payload from OpenAI TTS',
        },
      },
    );
  }

  try {
    const input = String(payload.input || '').trim();
    if (!input) return new Response('播报文本不能为空', { status: 400 });

    const { contentType, stream } = synthesizeByCyanSpeech(input);
    return new Response(stream as BodyInit, {
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Disposition': 'inline; filename="speech.mp3"',
        'Content-Type': contentType,
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : '语音播报失败', { status: 500 });
  }
};
