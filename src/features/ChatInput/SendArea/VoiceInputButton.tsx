'use client';

import { ActionIcon, Tooltip } from '@lobehub/ui';
import { message } from 'antd';
import { Loader2, Mic, Square } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { transcribeSpeech } from '@/services/speech';

import { useChatInputResourceAccess } from '../hooks/useChatInputResourceAccess';
import { useChatInputStore } from '../store';

const RECORDING_TIMESLICE_MS = 500;

const pickMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return '';

  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav',
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
};

const extensionFromMime = (mimeType: string) => {
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('mpeg')) return 'mp3';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
};

const VoiceInputButton = memo(() => {
  const { canShowControls } = useChatInputResourceAccess();
  const { generating } = useChatInputStore((s) => s.sendButtonProps || { generating: false });
  const [editor, setDocument, send] = useChatInputStore((s) => [
    s.editor,
    s.setDocument,
    s.handleSendButton,
  ]);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [status, setStatus] = useState<'idle' | 'recording' | 'transcribing'>('idle');

  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const transcribe = useCallback(async () => {
    const mimeType = recorderRef.current?.mimeType || 'audio/webm';
    const audio = new Blob(chunksRef.current, { type: mimeType });
    chunksRef.current = [];

    cleanup();

    if (!audio.size) {
      message.error('录音内容为空，请重试');
      setStatus('idle');
      return;
    }

    setStatus('transcribing');
    try {
      const filename = `speech.${extensionFromMime(mimeType)}`;
      const text = await transcribeSpeech(audio, filename);

      if (!text) {
        message.info('未检测到语音内容');
        return;
      }

      setDocument('markdown', text);
      requestAnimationFrame(() => {
        send();
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '语音识别失败');
    } finally {
      setStatus('idle');
    }
  }, [cleanup, send, setDocument]);

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      message.error('当前浏览器不支持录音功能');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });
      recorder.addEventListener('stop', () => {
        void transcribe();
      });

      recorder.start(RECORDING_TIMESLICE_MS);
      setStatus('recording');
    } catch (error) {
      cleanup();
      setStatus('idle');
      message.error(error instanceof Error ? error.message : '无法访问麦克风');
    }
  }, [cleanup, transcribe]);

  if (!canShowControls) return null;

  const isBusy = status !== 'idle';
  const blocked = generating || !editor || status === 'transcribing';
  const title =
    status === 'recording' ? '完成录音' : status === 'transcribing' ? '正在转写语音' : '语音输入';

  return (
    <Tooltip title={title}>
      <ActionIcon
        active={status === 'recording'}
        disabled={blocked && status !== 'recording'}
        icon={status === 'recording' ? Square : status === 'transcribing' ? Loader2 : Mic}
        size={'small'}
        title={title}
        onClick={() => {
          if (status === 'recording') {
            recorderRef.current?.stop();
            return;
          }
          if (!isBusy) void startRecording();
        }}
      />
    </Tooltip>
  );
});

VoiceInputButton.displayName = 'VoiceInputButton';

export default VoiceInputButton;
