import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createTimelinePlaybackController } from '../lib/timelinePlayback';

export const useGraphStudioPlayback = ({
  steps,
  currentFrame,
  setCurrentFrame,
  setStatus,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const stepsRef = useRef(steps);
  const currentFrameRef = useRef(currentFrame);
  const setCurrentFrameRef = useRef(setCurrentFrame);
  const setStatusRef = useRef(setStatus);
  const playbackLockedRef = useRef(false);
  useLayoutEffect(() => {
    stepsRef.current = steps;
    currentFrameRef.current = currentFrame;
    setCurrentFrameRef.current = setCurrentFrame;
    setStatusRef.current = setStatus;
  }, [currentFrame, setCurrentFrame, setStatus, steps]);

  const playbackRef = useRef(null);
  useEffect(() => {
    const playback = createTimelinePlaybackController({
      getSteps: () => stepsRef.current,
      getCurrentFrame: () => currentFrameRef.current,
      onFrameChange: (frame, frameCount) => {
        currentFrameRef.current = frame;
        setCurrentFrameRef.current(frame, frameCount);
      },
      onPlayingChange: setIsPlaying,
      onCannotPlay: () =>
        setStatusRef.current('Add more keyframes to play timeline'),
      canPlay: () => !playbackLockedRef.current,
      onPlayBlocked: () =>
        setStatusRef.current('Playback is unavailable while exporting.'),
    });
    playbackRef.current = playback;
    return () => {
      playback.dispose();
      playbackRef.current = null;
    };
  }, []);

  const stopTimeline = useCallback(() => playbackRef.current?.stop(), []);
  const playTimeline = useCallback(() => playbackRef.current?.play(), []);
  const setPlaybackLocked = useCallback(locked => {
    playbackLockedRef.current = Boolean(locked);
    if (playbackLockedRef.current) playbackRef.current?.stop();
  }, []);

  const togglePlayback = useCallback(() => playbackRef.current?.toggle(), []);

  return {
    isPlaying,
    playTimeline,
    stopTimeline,
    setPlaybackLocked,
    togglePlayback,
  };
};
