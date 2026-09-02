import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Play, Pause, Loader2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const VoiceRecorder = ({ onSend, onCancel, isSending = false }) => {
  const { showToast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const audioPreviewRef = useRef(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopAndCleanup();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      showToast('Microphone access is required to record voice notes.', 'error');
      if (onCancel) onCancel();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const stopAndCleanup = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  };

  const handleTogglePreview = () => {
    if (!audioPreviewRef.current) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleSend = () => {
    if (!audioBlob) {
      stopRecording();
      return;
    }

    const file = new File([audioBlob], `voice_note_${Date.now()}.webm`, {
      type: 'audio/webm',
    });

    onSend({ file, duration });
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  return (
    <div className="flex items-center gap-3 w-full bg-indigo-50/90 border border-indigo-200/80 rounded-2xl px-4 py-2.5 animate-in slide-in-from-bottom-2 duration-150 select-none">
      {/* Recording Indicator & Animation */}
      {isRecording ? (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-ping shrink-0" />
          <span className="text-xs font-mono font-bold text-red-600">
            REC {formatTime(duration)}
          </span>
          {/* Animated Waveform Simulation */}
          <div className="hidden sm:flex items-center gap-0.5 ml-2">
            {[40, 70, 30, 90, 50, 80, 60, 100, 45, 75, 55, 85].map((h, i) => (
              <div
                key={i}
                style={{ height: `${Math.max(6, (h * (duration % 2 ? 0.9 : 0.6)) / 3)}px` }}
                className="w-0.5 bg-indigo-600 rounded-full transition-all duration-150"
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-1">
          <button
            type="button"
            onClick={handleTogglePreview}
            className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors shrink-0 shadow-xs"
          >
            {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <span className="text-xs font-mono font-bold text-indigo-900">
            {formatTime(duration)}
          </span>
          <audio
            ref={audioPreviewRef}
            src={audioUrl}
            onEnded={() => setIsPlayingPreview(false)}
            className="hidden"
          />
        </div>
      )}

      <div className="flex-1" />

      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        {/* Cancel / Trash */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isSending}
          title="Discard voice note"
          className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Stop or Send */}
        {isRecording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Square className="w-3 h-3 fill-current" /> Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
          >
            {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {isSending ? 'Sending...' : 'Send'}
          </button>
        )}
      </div>
    </div>
  );
};
