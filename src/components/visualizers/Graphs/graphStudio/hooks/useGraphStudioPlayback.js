import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp } from '../graphStudioUtils';

export const useGraphStudioPlayback = ({
  steps,
  frameCount,
  currentFrame,
  setCurrentFrame,
  setStatus,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const timelineRef = useRef(null);

  const stopTimeline = useCallback(() => {
    if (timelineRef.current) {
      window.clearTimeout(timelineRef.current);
      timelineRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playTimeline = useCallback(() => {
    stopTimeline();
    if (frameCount <= 1) {
      setStatus('Add more keyframes to play timeline');
      return;
    }
    setIsPlaying(true);
    let cursor = currentFrame;
    const tick = () => {
      if (cursor >= frameCount) {
        setIsPlaying(false);
        return;
      }
      setCurrentFrame(cursor);
      const stepDuration = clamp(
        Number(steps[cursor]?.durationMs ?? 600),
        80,
        8000
      );
      cursor += 1;
      timelineRef.current = window.setTimeout(tick, stepDuration);
    };
    tick();
  }, [
    currentFrame,
    frameCount,
    setCurrentFrame,
    setStatus,
    steps,
    stopTimeline,
  ]);

  useEffect(() => {
    return () => {
      if (timelineRef.current) window.clearTimeout(timelineRef.current);
    };
  }, []);

  const togglePlayback = useCallback(() => {
    if (isPlaying) stopTimeline();
    else playTimeline();
  }, [isPlaying, playTimeline, stopTimeline]);

  return {
    isPlaying,
    playTimeline,
    stopTimeline,
    togglePlayback,
  };
};
