import { NextResponse } from 'next/server';

import { transcribeByCyanSpeech } from '@/server/services/cyanSpeech';

export const POST = async (req: Request) => {
  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: '请求必须使用 multipart/form-data' }, { status: 400 });
    }

    const audio = formData.get('audio');

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: '缺少音频文件' }, { status: 400 });
    }

    const text = await transcribeByCyanSpeech(audio);
    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '语音识别失败' },
      { status: 500 },
    );
  }
};
