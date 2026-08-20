export const transcribeSpeech = async (audio: Blob, filename: string): Promise<string> => {
  const formData = new FormData();
  formData.append('audio', audio, filename);

  const response = await fetch('/webapi/speech/asr', {
    body: formData,
    method: 'POST',
  });

  const result = (await response.json().catch(() => ({}))) as { error?: string; text?: string };
  if (!response.ok) {
    throw new Error(result.error || '语音识别失败');
  }

  return result.text?.trim() || '';
};
