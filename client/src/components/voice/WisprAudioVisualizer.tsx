import React, { useEffect, useRef } from 'react';
import { audioVisualizer } from '../../services/wisprFlowEngine';
import { Sparkles } from 'lucide-react';

interface WisprAudioVisualizerProps {
  isRecording: boolean;
  stream: MediaStream | null;
}

export const WisprAudioVisualizer: React.FC<WisprAudioVisualizerProps> = ({
  isRecording,
  stream,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRecording || !stream || !canvasRef.current) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      audioVisualizer.stop();
      return;
    }

    const dataArray = audioVisualizer.initialize(stream);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderWave = () => {
      animFrameIdRef.current = requestAnimationFrame(renderWave);

      const freqData = audioVisualizer.getFrequencyData() || dataArray;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const barCount = 28;
      const barWidth = Math.floor(width / barCount) - 3;
      let x = 4;

      for (let i = 0; i < barCount; i++) {
        // Sample frequency and add dynamic subtle oscillation
        const val = freqData[i % freqData.length] || 10;
        const normalized = val / 255;
        const barHeight = Math.max(4, normalized * (height - 6));

        // Modern glowing cyan-to-teal gradient
        const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
        gradient.addColorStop(0, '#14b8a6'); // Teal 500
        gradient.addColorStop(1, '#06b6d4'); // Cyan 500

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, height - barHeight, barWidth, barHeight, 3);
        ctx.fill();

        x += barWidth + 3;
      }
    };

    renderWave();

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      audioVisualizer.stop();
    };
  }, [isRecording, stream]);

  if (!isRecording) return null;

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-emerald-500/10 border border-teal-500/30 rounded-2xl backdrop-blur-md shadow-sm transition-all animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-600"></span>
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          Wispr Flow Active Audio Stream
        </span>
        <span className="text-[10px] bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full font-medium">
          Filler-Word Filter ON
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={320}
        height={36}
        className="w-full max-w-xs h-9 rounded-lg"
      />
    </div>
  );
};
