/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type InstrumentType = 'kick' | 'hihat' | 'bass' | 'lead';
export type PlaybackMode = 'rhythmic' | 'continuous';
export type AutonomousMode = 'none' | 'circular' | 'dvd' | 'tracking';

export interface SensorData {
  id: number;
  x: number; // 0 to 800 (logical width)
  y: number; // 0 to 450 (logical height)
  baseX: number; // Base position for circular orbit
  baseY: number; // Base position for circular orbit
  instrument: InstrumentType;
  mode: PlaybackMode;
  volume: number; // slider -40 to +10 dB
  pitch: number; // transpose -24 to +24 Semitones
  timbre: number; // 0 to 100%
  autonomousMode: AutonomousMode;
  
  sensitivity?: number; // 0 to 100 (Default 50)
  arpEnabled?: boolean;
  arpSpeed?: number; // Speed in ms (e.g., 100 to 500ms)
  arpPattern?: 'up' | 'down' | 'random';

  // Dynamic runtime properties
  color: string; // Hex representation of detected avg color
  avgColor: { r: number; g: number; b: number; brightness: number; h?: number; s?: number; l?: number };
  movement: number; // Local movement amplitude (0-255)
  smoothedMovement?: number; // EMA smoothed movement for organic swell
  currentNote?: string; // Active musical note label (e.g. "Sol4 (G4)")
  breathVal?: number; // 0 to 1 organic breathing cycle for continuous drones
  pan?: number; // Stereo pan (-1.0 to 1.0)
  phase: number; // Orbtial angle in radians
  velX: number; // velocity for DVD bounce
  velY: number; // velocity for DVD bounce
  isActive: boolean; // Visual trigger status (flash/glow effect)
  lastTriggered: number; // timestamp to prevent double triggers within min 100ms
}

export interface AppState {
  sensors: SensorData[];
  selectedSensorId: number | null;
  isPlaying: boolean; // Video playback state
  isRecording: boolean; // MediaRecorder state
  recordingUrl: string | null;
  globalMovement: number; // 0 to 100 (Delay amount)
  delayFeedback: number; // mapped from global movement
  useAutonomous: boolean; // Master toggle for autonomous movement
  videoUrl: string | null;
  isAudioContextStarted: boolean;
}
