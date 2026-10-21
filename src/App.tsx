/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Plus, 
  Minus, 
  Sliders, 
  Video, 
  RefreshCw, 
  Download, 
  HelpCircle,
  X,
  Volume2,
  ChevronDown,
  Camera,
  Radio,
  FileAudio,
  Activity,
  Sparkles,
  Music,
  Compass
} from 'lucide-react';
import { InstrumentType, PlaybackMode, AutonomousMode, SensorData } from './types';
import { AudioEngine, SCALES, CHROMATIC_ROOTS, SCALE_TEMPLATES, rgbToHsl } from './audio';
import { PRESETS, INITIAL_SENSORS } from './presets';

const DEMO_VIDEOS = [
  { 
    id: 'abstract_colors', 
    name: 'Demonstração 1: Laser Psicodélico', 
    url: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-41712-large.mp4' 
  },
  { 
    id: 'neon_flashing', 
    name: 'Demonstração 2: Neon Pulsante', 
    url: 'https://assets.mixkit.co/videos/preview/mixkit-neon-light-strips-flashing-and-moving-43257-large.mp4' 
  },
  {
    id: 'liquid_flow',
    name: 'Demonstração 3: Fluxo de Luzes',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-flowing-multicolored-streaks-of-light-34241-large.mp4'
  }
];

const ALL_NOTES_PT = [
  { note: 'C', pt: 'Dó' },
  { note: 'C#', pt: 'Dó♯' },
  { note: 'D', pt: 'Ré' },
  { note: 'D#', pt: 'Ré♯' },
  { note: 'E', pt: 'Mi' },
  { note: 'F', pt: 'Fá' },
  { note: 'F#', pt: 'Fá♯' },
  { note: 'G', pt: 'Sol' },
  { note: 'G#', pt: 'Sol♯' },
  { note: 'A', pt: 'Lá' },
  { note: 'A#', pt: 'Lá♯' },
  { note: 'B', pt: 'Si' }
];

const getAvailableNotesForCategory = (cat: 'lead' | 'bass' | 'kick') => {
  const octaves = cat === 'kick' ? [1] : cat === 'bass' ? [2, 3] : [4, 5];
  const list: { val: string; label: string }[] = [];
  octaves.forEach(oct => {
    ALL_NOTES_PT.forEach(n => {
      list.push({
        val: `${n.note}${oct}`,
        label: `${n.pt}${oct} (${n.note}${oct})`
      });
    });
  });
  return list;
};

export default function App() {
  // --- React State for UI & User Configuration ---
  const [sensors, setSensors] = useState<SensorData[]>(INITIAL_SENSORS);
  const [selectedSensorId, setSelectedSensorId] = useState<number | null>(4);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [videoSource, setVideoSource] = useState<string>('generator'); // 'generator' | 'webcam' | url
  const [audioContextActive, setAudioContextActive] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [globalReverb, setGlobalReverb] = useState<number>(35);
  const [selectedScale, setSelectedScale] = useState<string>('minor_pentatonic');
  const [rootKey, setRootKey] = useState<string>('C');
  const [bpm, setBpm] = useState<number>(100);
  const [groove, setGroove] = useState<number>(30);
  const [inertia, setInertia] = useState<number>(65);
  const [activeTab, setActiveTab] = useState<'visualizer' | 'controls'>('visualizer');
  const [scaleVersion, setScaleVersion] = useState<number>(0);
  const [isGlobalAudioExpanded, setIsGlobalAudioExpanded] = useState<boolean>(true);
  const [globalSensorOpacity, setGlobalSensorOpacityState] = useState<number>(100);
  const [webcamError, setWebcamError] = useState<string | null>(null);

  // Recording states
  const [recordingMode, setRecordingMode] = useState<'none' | 'video' | 'audio'>('none');
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  // Throttled UI Telemetry (updated at 10Hz to prevent 60 FPS re-render storms)
  const [telemetry, setTelemetry] = useState<{
    globalMovement: number;
    selectedColor: string;
    selectedR: number;
    selectedG: number;
    selectedB: number;
    selectedH: number;
    selectedS: number;
    selectedL: number;
    selectedPan: number;
    selectedNotePt: string;
    activeChordNotes: string[];
    selectedBright: number;
    selectedX: number;
    selectedY: number;
    selectedIsActive: boolean;
  }>({
    globalMovement: 15,
    selectedColor: '#ec4899',
    selectedR: 236,
    selectedG: 72,
    selectedB: 153,
    selectedH: 330,
    selectedS: 82,
    selectedL: 60,
    selectedPan: 0.4,
    selectedNotePt: 'Dó4',
    activeChordNotes: ['Dó2', 'Sol3', 'Mi♭4'],
    selectedBright: 140,
    selectedX: 550,
    selectedY: 300,
    selectedIsActive: false
  });

  // --- Refs ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // High-frequency mutable refs for physics & render loop
  const sensorsRef = useRef<SensorData[]>(INITIAL_SENSORS);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const videoSourceRef = useRef<string>(videoSource);
  const selectedSensorIdRef = useRef<number | null>(selectedSensorId);
  const draggingSensorIdRef = useRef<number | null>(null);
  const dragCoordsRef = useRef<{ x: number; y: number } | null>(null);
  const sensorOpacityRef = useRef<number>(100);
  const generatorTimeRef = useRef<number>(0);
  const lastTelemetryUpdateRef = useRef<number>(0);
  const globalMovementSmoothRef = useRef<number>(15);

  const setGlobalSensorOpacity = (val: number) => {
    sensorOpacityRef.current = val;
    setGlobalSensorOpacityState(val);
  };

  // Sync state into refs
  useEffect(() => {
    sensorsRef.current = sensors;
  }, [sensors]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    videoSourceRef.current = videoSource;
  }, [videoSource]);

  useEffect(() => {
    selectedSensorIdRef.current = selectedSensorId;
  }, [selectedSensorId]);

  // Synchronize Audio Engine when sensor configurations change (only on user edits/presets)
  useEffect(() => {
    AudioEngine.syncSensors(sensors);
  }, [sensors]);

  // Sync global reverb on change
  useEffect(() => {
    AudioEngine.modulateGlobalReverb(globalReverb);
  }, [globalReverb]);

  const tapTimesRef = useRef<number[]>([]);

  const handleRootKeyChange = (newRoot: string) => {
    setRootKey(newRoot);
    AudioEngine.setRootKey(newRoot);
    setScaleVersion(v => v + 1);
  };

  const handleScaleChange = (scaleKey: string) => {
    setSelectedScale(scaleKey);
    AudioEngine.setScale(scaleKey);
    setScaleVersion(v => v + 1);
  };

  const handleBpmChange = (newBpm: number) => {
    setBpm(newBpm);
    AudioEngine.setBpm(newBpm);
  };

  const handleGrooveChange = (newGroove: number) => {
    setGroove(newGroove);
    AudioEngine.setGroove(newGroove);
  };

  const handleInertiaChange = (newInertia: number) => {
    setInertia(newInertia);
    AudioEngine.setInertia(newInertia);
  };

  const handleTapTempo = () => {
    const now = Date.now();
    const times = tapTimesRef.current;
    if (times.length > 0 && now - times[times.length - 1] > 2000) {
      times.length = 0;
    }
    times.push(now);
    if (times.length > 5) times.shift();
    if (times.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < times.length; i++) {
        intervals.push(times[i] - times[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const computedBpm = Math.round(60000 / avgInterval);
      const clampedBpm = Math.max(50, Math.min(180, computedBpm));
      handleBpmChange(clampedBpm);
    }
  };

  const handleAddScaleNote = (scaleKey: string, category: 'kick' | 'bass' | 'lead', note: string) => {
    const validNoteRegex = /^[A-G]#?\d$/i;
    const formattedNote = note.trim().toUpperCase();
    if (!validNoteRegex.test(formattedNote)) {
      return;
    }
    const currentNotes = SCALES[scaleKey]?.[category] || [];
    SCALES[scaleKey][category] = [...currentNotes, formattedNote];
    setScaleVersion(v => v + 1);
    AudioEngine.updateScaleCategoryNotes(scaleKey, category, SCALES[scaleKey][category]);
  };

  const handleRemoveScaleNote = (scaleKey: string, category: 'kick' | 'bass' | 'lead', indexToRemove: number) => {
    const currentNotes = SCALES[scaleKey]?.[category] || [];
    const updated = currentNotes.filter((_, idx) => idx !== indexToRemove);
    SCALES[scaleKey][category] = updated;
    setScaleVersion(v => v + 1);
    AudioEngine.updateScaleCategoryNotes(scaleKey, category, updated);
  };

  // Clean stop any active webcam stream
  const stopWebcamStream = useCallback(() => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {}
      });
      webcamStreamRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Handle Play/Pause
  const togglePlay = async () => {
    if (!audioContextActive) {
      await AudioEngine.startAudioContext();
      setAudioContextActive(true);
    }

    if (isPlaying) {
      setIsPlaying(false);
      AudioEngine.stopAllDrones();
      if (videoRef.current) {
        videoRef.current.pause();
      }
    } else {
      setIsPlaying(true);
      if (videoRef.current && videoSource !== 'generator') {
        videoRef.current.play().catch(err => console.log('Video playback paused/interrupted', err));
      }
    }
  };

  // Switch video background or uploader stream
  const selectVideoSource = async (src: string) => {
    stopWebcamStream();
    setWebcamError(null);
    setVideoSource(src);
    setIsPlaying(false);
    AudioEngine.stopAllDrones();

    const video = videoRef.current;
    if (!video) return;

    if (src === 'generator') {
      video.pause();
      video.src = '';
      video.srcObject = null;
    } else if (src === 'webcam') {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Navegador não suporta acesso à webcam.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 800 }, height: { ideal: 450 }, facingMode: 'user' },
          audio: false
        });
        webcamStreamRef.current = stream;
        video.src = '';
        video.srcObject = stream;
        await video.play();
        setIsPlaying(true);
      } catch (err: any) {
        console.warn('Webcam initialization error:', err);
        setWebcamError(err.message || 'Permissão de webcam negada ou câmera ocupada.');
        setVideoSource('generator');
        video.src = '';
        video.srcObject = null;
      }
    } else {
      // Demo video or uploaded file
      video.pause();
      video.srcObject = null;
      video.src = src;
      video.load();
    }
  };

  // File Upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      selectVideoSource(fileUrl);
    }
  };

  // Add & Remove Sensors
  const addSensor = () => {
    if (sensors.length >= 16) return;
    const nextId = sensors.length > 0 ? Math.max(...sensors.map(s => s.id)) + 1 : 1;

    const newSensor: SensorData = {
      id: nextId,
      x: 350 + (Math.random() - 0.5) * 120,
      y: 220 + (Math.random() - 0.5) * 100,
      baseX: 380,
      baseY: 220,
      instrument: 'lead',
      mode: 'continuous',
      volume: -6,
      pitch: 0,
      timbre: 50,
      sensitivity: 50,
      arpEnabled: false,
      arpSpeed: 200,
      arpPattern: 'up',
      autonomousMode: 'none',
      color: '#a855f7',
      avgColor: { r: 168, g: 85, b: 247, brightness: 120 },
      movement: 0,
      velX: 3,
      velY: 2,
      phase: Math.random() * Math.PI,
      isActive: false,
      lastTriggered: 0
    };

    const nextList = [...sensors, newSensor];
    setSensors(nextList);
    sensorsRef.current = nextList;
    setSelectedSensorId(nextId);
    setActiveTab('controls');
  };

  const removeSensor = (idToRemove: number) => {
    const filtered = sensors.filter(s => s.id !== idToRemove);
    setSensors(filtered);
    sensorsRef.current = filtered;
    AudioEngine.stopDroneNode(idToRemove);
    if (selectedSensorId === idToRemove) {
      setSelectedSensorId(filtered.length > 0 ? filtered[0].id : null);
    }
  };

  const removeLastSensor = () => {
    if (sensors.length <= 1) return;
    const lastId = sensors[sensors.length - 1].id;
    removeSensor(lastId);
  };

  // Preset Importer
  const loadPreset = (presetKey: string) => {
    AudioEngine.stopAllDrones();
    setIsPlaying(false);

    const preset = PRESETS[presetKey];
    if (!preset) return;

    const loadedSensors: SensorData[] = preset.sensors.map((s, idx) => {
      const defaultSensor = INITIAL_SENSORS[idx % INITIAL_SENSORS.length];
      return {
        id: s.id ?? idx + 1,
        x: s.x ?? defaultSensor.x,
        y: s.y ?? defaultSensor.y,
        baseX: s.baseX ?? s.x ?? defaultSensor.baseX,
        baseY: s.baseY ?? s.y ?? defaultSensor.baseY,
        instrument: s.instrument ?? 'lead',
        mode: s.mode ?? 'continuous',
        volume: s.volume ?? -6,
        pitch: s.pitch ?? 0,
        timbre: s.timbre ?? 50,
        sensitivity: s.sensitivity ?? 50,
        arpEnabled: s.arpEnabled ?? false,
        arpSpeed: s.arpSpeed ?? 200,
        arpPattern: s.arpPattern ?? 'up',
        autonomousMode: s.autonomousMode ?? 'none',
        color: '#999999',
        avgColor: { r: 128, g: 128, b: 128, brightness: 120 },
        movement: 0,
        velX: s.velX ?? 3,
        velY: s.velY ?? 2,
        phase: s.phase ?? 0,
        isActive: false,
        lastTriggered: 0
      };
    });

    setSensors(loadedSensors);
    sensorsRef.current = loadedSensors;
    setSelectedSensorId(loadedSensors[0]?.id || null);
    setActiveTab('controls');
  };

  // Randomize all configurations of active sensors
  const triggerRandomization = () => {
    AudioEngine.stopAllDrones();
    const instruments: InstrumentType[] = ['kick', 'hihat', 'bass', 'lead'];
    const modes: PlaybackMode[] = ['rhythmic', 'continuous'];
    const autoModes: AutonomousMode[] = ['none', 'circular', 'dvd', 'tracking'];

    const randomized = sensors.map(s => {
      const inst = instruments[Math.floor(Math.random() * instruments.length)];
      const mode = modes[Math.floor(Math.random() * modes.length)];
      const auto = autoModes[Math.floor(Math.random() * autoModes.length)];

      const rndX = Math.floor(100 + Math.random() * 600);
      const rndY = Math.floor(100 + Math.random() * 250);

      return {
        ...s,
        instrument: inst,
        mode: mode,
        autonomousMode: auto,
        volume: -15 + Math.floor(Math.random() * 20),
        pitch: -12 + Math.floor(Math.random() * 25),
        timbre: 10 + Math.floor(Math.random() * 80),
        sensitivity: 30 + Math.floor(Math.random() * 50),
        x: rndX,
        y: rndY,
        baseX: rndX,
        baseY: rndY
      };
    });

    setSensors(randomized);
    sensorsRef.current = randomized;
  };

  // Clean-up webcam on unmount
  useEffect(() => {
    return () => {
      stopWebcamStream();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [stopWebcamStream]);

  // --- High-Performance 60 FPS Visuals & Audio Modulation Loop ---
  useEffect(() => {
    const processFrame = () => {
      const canvas = canvasRef.current;
      const offscreen = offscreenCanvasRef.current;
      const video = videoRef.current;

      if (!canvas || !offscreen) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const ctx = canvas.getContext('2d');
      const offscreenCtx = offscreen.getContext('2d', { willReadFrequently: true });

      if (!ctx || !offscreenCtx) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const isPlayingCurrent = isPlayingRef.current;
      const videoSourceCurrent = videoSourceRef.current;
      const selectedId = selectedSensorIdRef.current;
      const activeSensors = sensorsRef.current;

      // 1. Draw Video Frame or Generative Backdrop into offscreen plane
      if (videoSourceCurrent !== 'generator' && video && video.readyState >= 2) {
        // If webcam, mirror horizontally for natural feel
        if (videoSourceCurrent === 'webcam') {
          offscreenCtx.save();
          offscreenCtx.translate(800, 0);
          offscreenCtx.scale(-1, 1);
          offscreenCtx.drawImage(video, 0, 0, 800, 450);
          offscreenCtx.restore();
        } else {
          offscreenCtx.drawImage(video, 0, 0, 800, 450);
        }
      } else {
        // Generative internal visualizer
        generatorTimeRef.current += isPlayingCurrent ? 0.015 : 0.002;
        const time = generatorTimeRef.current;

        // Background
        const grad = offscreenCtx.createLinearGradient(0, 0, 800, 450);
        grad.addColorStop(0, '#0c0a09');
        grad.addColorStop(0.5, '#17142b');
        grad.addColorStop(1, '#0c0a09');
        offscreenCtx.fillStyle = grad;
        offscreenCtx.fillRect(0, 0, 800, 450);

        // Grid lines
        offscreenCtx.strokeStyle = 'rgba(168, 85, 247, 0.04)';
        offscreenCtx.lineWidth = 1;
        for (let j = 0; j < 800; j += 40) {
          offscreenCtx.beginPath();
          offscreenCtx.moveTo(j, 0);
          offscreenCtx.lineTo(j, 450);
          offscreenCtx.stroke();
        }
        for (let j = 0; j < 450; j += 40) {
          offscreenCtx.beginPath();
          offscreenCtx.moveTo(0, j);
          offscreenCtx.lineTo(800, j);
          offscreenCtx.stroke();
        }

        // Kinetic flares
        offscreenCtx.strokeStyle = 'rgba(236, 72, 153, 0.3)';
        offscreenCtx.lineWidth = 4;
        offscreenCtx.beginPath();
        for (let k = 0; k < 800; k += 10) {
          const yVal = 225 + Math.sin(time + k * 0.01) * 85 * Math.sin(time * 0.4) 
                           + Math.cos(time * 0.8 + k * 0.005) * 40;
          if (k === 0) offscreenCtx.moveTo(k, yVal);
          else offscreenCtx.lineTo(k, yVal);
        }
        offscreenCtx.stroke();

        // Secondary cyan/blue trail
        offscreenCtx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
        offscreenCtx.lineWidth = 2;
        offscreenCtx.beginPath();
        for (let k = 0; k < 800; k += 15) {
          const yVal = 225 + Math.cos(time * 1.2 + k * 0.015) * 110 * Math.cos(time * 0.3);
          if (k === 0) offscreenCtx.moveTo(k, yVal);
          else offscreenCtx.lineTo(k, yVal);
        }
        offscreenCtx.stroke();

        // Bouncing bright object for motion tracking demo
        const trackerX = 400 + Math.cos(time * 1.1) * 280;
        const trackerY = 225 + Math.sin(time * 0.7) * 160;

        const radialGrad = offscreenCtx.createRadialGradient(trackerX, trackerY, 2, trackerX, trackerY, 90);
        radialGrad.addColorStop(0, 'rgba(236, 72, 153, 0.95)');
        radialGrad.addColorStop(0.2, 'rgba(168, 85, 247, 0.5)');
        radialGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.25)');
        radialGrad.addColorStop(1, 'rgba(0,0,0,0)');
        offscreenCtx.fillStyle = radialGrad;
        offscreenCtx.beginPath();
        offscreenCtx.arc(trackerX, trackerY, 90, 0, 2 * Math.PI);
        offscreenCtx.fill();

        offscreenCtx.fillStyle = '#ffffff';
        offscreenCtx.beginPath();
        offscreenCtx.arc(trackerX, trackerY, 8 + Math.sin(time * 10) * 2, 0, 2 * Math.PI);
        offscreenCtx.fill();
      }

      // 2. Sample pixel buffer for RGB and luminosity analysis
      const imgData = offscreenCtx.getImageData(0, 0, 800, 450);
      const pixels = imgData.data;

      const now = Date.now();
      let totalAccumulatedMovement = 0;

      // 3. Process each sensor (Física + Análise Óptica + Modulação Tone.js)
      for (let i = 0; i < activeSensors.length; i++) {
        const s = activeSensors[i];
        let currentX = s.x;
        let currentY = s.y;
        let pBaseX = s.baseX;
        let pBaseY = s.baseY;
        let curPhase = s.phase;
        let cVelX = s.velX;
        let cVelY = s.velY;

        const isCurrentlyDragged = s.id === draggingSensorIdRef.current;

        if (isCurrentlyDragged && dragCoordsRef.current) {
          currentX = dragCoordsRef.current.x;
          currentY = dragCoordsRef.current.y;
          pBaseX = dragCoordsRef.current.x;
          pBaseY = dragCoordsRef.current.y;
        } else if (isPlayingCurrent && s.autonomousMode !== 'none') {
          switch (s.autonomousMode) {
            case 'circular':
              curPhase = (curPhase + 0.02) % (2 * Math.PI);
              currentX = pBaseX + Math.cos(curPhase) * 150;
              currentY = pBaseY + Math.sin(curPhase) * 150;
              break;

            case 'dvd':
              currentX += cVelX;
              currentY += cVelY;

              if (currentX - 32 <= 0) {
                currentX = 32;
                cVelX = Math.abs(cVelX);
              } else if (currentX + 32 >= 800) {
                currentX = 800 - 32;
                cVelX = -Math.abs(cVelX);
              }

              if (currentY - 32 <= 0) {
                currentY = 32;
                cVelY = Math.abs(cVelY);
              } else if (currentY + 32 >= 450) {
                currentY = 450 - 32;
                cVelY = -Math.abs(cVelY);
              }
              break;

            case 'tracking':
              let maxBright = -1;
              let targetBrightX = currentX;
              let targetBrightY = currentY;

              const scanRadius = 64;
              for (let sy = Math.floor(currentY - scanRadius); sy <= currentY + scanRadius; sy += 8) {
                for (let sx = Math.floor(currentX - scanRadius); sx <= currentX + scanRadius; sx += 8) {
                  if (sx >= 0 && sx < 800 && sy >= 0 && sy < 450) {
                    const dx = sx - currentX;
                    const dy = sy - currentY;
                    if (dx * dx + dy * dy <= scanRadius * scanRadius) {
                      const pxIndex = (sy * 800 + sx) * 4;
                      const rP = pixels[pxIndex];
                      const gP = pixels[pxIndex + 1];
                      const bP = pixels[pxIndex + 2];
                      const brP = (rP + gP + bP) / 3;

                      if (brP > maxBright) {
                        maxBright = brP;
                        targetBrightX = sx;
                        targetBrightY = sy;
                      }
                    }
                  }
                }
              }

              // Smooth chase interpolation (5% per frame)
              currentX += (targetBrightX - currentX) * 0.05;
              currentY += (targetBrightY - currentY) * 0.05;
              break;
          }
        }

        // Clamp boundaries
        currentX = Math.max(32, Math.min(800 - 32, currentX));
        currentY = Math.max(32, Math.min(450 - 32, currentY));

        // Color & Luminosity Sampling (32px radius, step 4)
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        const probeRadius = 32;
        const cx = Math.floor(currentX);
        const cy = Math.floor(currentY);

        for (let dy = -probeRadius; dy <= probeRadius; dy += 4) {
          for (let dx = -probeRadius; dx <= probeRadius; dx += 4) {
            if (dx * dx + dy * dy <= probeRadius * probeRadius) {
              const px = cx + dx;
              const py = cy + dy;
              if (px >= 0 && px < 800 && py >= 0 && py < 450) {
                const pxIndex = (py * 800 + px) * 4;
                rSum += pixels[pxIndex];
                gSum += pixels[pxIndex + 1];
                bSum += pixels[pxIndex + 2];
                count++;
              }
            }
          }
        }

        let curR = 120, curG = 120, curB = 120, curBright = 120;
        if (count > 0) {
          curR = Math.floor(rSum / count);
          curG = Math.floor(gSum / count);
          curB = Math.floor(bSum / count);
          curBright = Math.floor((curR + curG + curB) / 3);
        }

        const hsl = rgbToHsl(curR, curG, curB);
        const computedHex = `#${((1 << 24) + (curR << 16) + (curG << 8) + curB).toString(16).slice(1)}`;
        const pan = Math.max(-0.95, Math.min(0.95, (currentX - 400) / 370));

        // Movement Tracker
        const prevBright = s.avgColor ? s.avgColor.brightness : 120;
        const rawLocalMovement = Math.abs(curBright - prevBright);
        totalAccumulatedMovement += rawLocalMovement;

        // Visual trigger conditions & Audio modulation
        let triggerPulseActive = s.isActive;
        let lastTrigTime = s.lastTriggered;

        const sens = s.sensitivity !== undefined ? s.sensitivity : 50;
        const moveThreshold = 15 - (sens * 13 / 100);
        const brightThreshold = 60 - (sens * 55 / 100);

        const colorData = {
          r: curR,
          g: curG,
          b: curB,
          brightness: curBright,
          h: hsl.h,
          s: hsl.s,
          l: hsl.l,
          movement: rawLocalMovement
        };

        if (isPlayingCurrent) {
          if (s.mode === 'rhythmic') {
            if (rawLocalMovement > moveThreshold && curBright > brightThreshold) {
              if (now - lastTrigTime > 100) {
                AudioEngine.triggerRhythmicStroke(s.id, colorData, s.pitch, currentX, currentY);
                triggerPulseActive = true;
                lastTrigTime = now;
              }
            }
            if (now - lastTrigTime > 125) {
              triggerPulseActive = false;
            }
          } else {
            AudioEngine.updateContinuousDrone(s.id, colorData, s.pitch, currentX, currentY);
            triggerPulseActive = curBright > 6;
          }
        } else {
          triggerPulseActive = false;
        }

        const voiceTelemetry = AudioEngine.getSensorVoiceTelemetry(s.id);

        // Direct mutable update inside ref without triggering React re-renders!
        s.x = currentX;
        s.y = currentY;
        s.baseX = pBaseX;
        s.baseY = pBaseY;
        s.phase = curPhase;
        s.velX = cVelX;
        s.velY = cVelY;
        s.pan = pan;
        s.color = computedHex;
        s.avgColor = colorData;
        s.movement = rawLocalMovement;
        s.currentNote = voiceTelemetry.notePt;
        s.breathVal = voiceTelemetry.breath;
        s.isActive = triggerPulseActive;
        s.lastTriggered = lastTrigTime;
      }

      // Smooth global movement
      const mappedGlobalScale = Math.min(100, Math.round((totalAccumulatedMovement / Math.max(1, activeSensors.length)) * 5));
      globalMovementSmoothRef.current = Math.round(globalMovementSmoothRef.current * 0.92 + mappedGlobalScale * 0.08);

      if (isPlayingCurrent) {
        AudioEngine.modulateGlobalDelay(globalMovementSmoothRef.current);
      }

      // 4. Render Composite Canvas Overlay
      ctx.clearRect(0, 0, 800, 450);
      ctx.drawImage(offscreen, 0, 0);

      ctx.globalAlpha = sensorOpacityRef.current / 100;

      // Draw subtle harmonic cords between sensors
      for (let a = 0; a < activeSensors.length; a++) {
        for (let b = a + 1; b < activeSensors.length; b++) {
          const sA = activeSensors[a];
          const sB = activeSensors[b];
          const dist = Math.sqrt(Math.pow(sA.x - sB.x, 2) + Math.pow(sA.y - sB.y, 2));
          if (dist < 320) {
            const isHighlighted = sA.id === selectedId || sB.id === selectedId || (sA.isActive && sB.isActive);
            const alpha = (isHighlighted ? 0.28 : 0.12) * (1 - dist / 320);
            ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
            ctx.lineWidth = isHighlighted ? 1.5 : 1;
            ctx.setLineDash([3, 5]);
            ctx.beginPath();
            ctx.moveTo(sA.x, sA.y);
            ctx.lineTo(sB.x, sB.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }

      // Render aesthetic guidelines and sensor nodes
      activeSensors.forEach(sensor => {
        // Orbit ring trail
        if (sensor.autonomousMode === 'circular') {
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 5]);
          ctx.beginPath();
          ctx.arc(sensor.baseX, sensor.baseY, 150, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Motion tracking bounding box
        if (sensor.autonomousMode === 'tracking') {
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 4]);
          ctx.beginPath();
          ctx.arc(sensor.x, sensor.y, 64, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Active pulse glow: continuous mode uses smooth organic LFO breathing halo
        if (sensor.isActive) {
          const breath = sensor.breathVal ?? 0.5;
          ctx.strokeStyle = sensor.color;
          ctx.lineWidth = sensor.mode === 'continuous' ? 1.5 + breath * 2 : 3;
          ctx.beginPath();
          const rPulse = sensor.mode === 'continuous'
            ? 34 + breath * 8
            : 32 + Math.abs(Math.sin(now / 110) * 12);
          ctx.arc(sensor.x, sensor.y, rPulse, 0, 2 * Math.PI);
          ctx.stroke();
        }

        // Main probe body
        ctx.shadowColor = sensor.color;
        ctx.shadowBlur = sensor.isActive ? (sensor.mode === 'continuous' ? 10 : 14) : 3;

        ctx.fillStyle = sensor.color;
        ctx.strokeStyle = selectedId === sensor.id ? '#ffffff' : 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = selectedId === sensor.id ? 3 : 1.5;

        ctx.beginPath();
        ctx.arc(sensor.x, sensor.y, 32, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Label: ID + Instrument + Live Note
        const brightVal = sensor.avgColor?.brightness || 120;
        ctx.fillStyle = brightVal > 128 ? '#000000' : '#ffffff';
        ctx.font = '700 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const noteTag = sensor.currentNote ? ` · ${sensor.currentNote}` : '';
        ctx.fillText(`S${sensor.id}${noteTag}`, sensor.x, sensor.y - 6);

        ctx.font = '500 8px "JetBrains Mono", monospace';
        const modeLabel = sensor.mode === 'continuous' ? 'DRONE' : 'RITMO';
        ctx.fillText(`${sensor.instrument.toUpperCase()} (${modeLabel})`, sensor.x, sensor.y + 6);

        // Mini Stereo Pan indicator bar
        const panVal = sensor.pan ?? 0;
        const barW = 28;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(sensor.x - barW / 2, sensor.y + 16, barW, 3);
        const indicatorX = sensor.x + (panVal * (barW / 2 - 2));
        ctx.fillStyle = '#c084fc';
        ctx.fillRect(indicatorX - 1.5, sensor.y + 15, 3, 5);
      });

      ctx.globalAlpha = 1.0;

      // 5. Throttled UI Telemetry Update (~10 Hz)
      if (now - lastTelemetryUpdateRef.current > 100) {
        lastTelemetryUpdateRef.current = now;
        const curTarget = activeSensors.find(s => s.id === selectedId);
        setTelemetry({
          globalMovement: globalMovementSmoothRef.current,
          selectedColor: curTarget?.color || '#a855f7',
          selectedR: curTarget?.avgColor?.r || 128,
          selectedG: curTarget?.avgColor?.g || 128,
          selectedB: curTarget?.avgColor?.b || 128,
          selectedH: curTarget?.avgColor?.h ?? 0,
          selectedS: curTarget?.avgColor?.s ?? 50,
          selectedL: curTarget?.avgColor?.l ?? 50,
          selectedPan: curTarget?.pan ?? 0,
          selectedNotePt: curTarget?.currentNote || '—',
          activeChordNotes: AudioEngine.getActiveChordNotesPt(),
          selectedBright: curTarget?.avgColor?.brightness || 128,
          selectedX: curTarget ? Math.round(curTarget.x) : 400,
          selectedY: curTarget ? Math.round(curTarget.y) : 225,
          selectedIsActive: curTarget?.isActive || false
        });
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // --- Session Recording Handlers ---
  const startRecordingTimer = () => {
    setRecordingSeconds(0);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds(sec => sec + 1);
    }, 1000);
  };

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // 1. Video WebM Recording (Canvas + Master Audio)
  const startVideoRecording = async () => {
    if (!audioContextActive) {
      await AudioEngine.startAudioContext();
      setAudioContextActive(true);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    recordedChunksRef.current = [];
    const canvasStream = canvas.captureStream(30);
    const audioTrack = AudioEngine.getAudioStreamTrack();

    const mergedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
    if (audioTrack) {
      mergedTracks.push(audioTrack);
    }

    const outputStream = new MediaStream(mergedTracks);

    let mime = 'video/webm;codecs=vp8,opus';
    if (!MediaRecorder.isTypeSupported(mime)) {
      mime = 'video/webm';
    }

    try {
      const recorder = new MediaRecorder(outputStream, {
        mimeType: mime,
        audioBitsPerSecond: 192000
      });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const downloadUrl = URL.createObjectURL(fullBlob);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const triggerDownload = document.createElement('a');
        triggerDownload.href = downloadUrl;
        triggerDownload.download = `sintetizador_video_${timestamp}.webm`;
        document.body.appendChild(triggerDownload);
        triggerDownload.click();
        triggerDownload.remove();
        URL.revokeObjectURL(downloadUrl);
        stopRecordingTimer();
        setRecordingMode('none');
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordingMode('video');
      startRecordingTimer();
    } catch (e) {
      console.error('Video recording failed', e);
      setRecordingMode('none');
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    stopRecordingTimer();
  };

  // 2. Pure Audio WAV Recording
  const startAudioWavRecording = async () => {
    if (!audioContextActive) {
      await AudioEngine.startAudioContext();
      setAudioContextActive(true);
    }

    const started = AudioEngine.startWavRecording();
    if (started) {
      setRecordingMode('audio');
      startRecordingTimer();
    }
  };

  const stopAudioWavRecording = () => {
    const wavBlob = AudioEngine.stopWavRecording();
    stopRecordingTimer();
    setRecordingMode('none');

    if (wavBlob) {
      const downloadUrl = URL.createObjectURL(wavBlob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const triggerDownload = document.createElement('a');
      triggerDownload.href = downloadUrl;
      triggerDownload.download = `sintetizador_audio_${timestamp}.wav`;
      document.body.appendChild(triggerDownload);
      triggerDownload.click();
      triggerDownload.remove();
      URL.revokeObjectURL(downloadUrl);
    }
  };

  // --- Mouse / Touch Drag Handlers ---
  const convertEventToLogicalCoords = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const bounds = canvas.getBoundingClientRect();
    const relativeX = clientX - bounds.left;
    const relativeY = clientY - bounds.top;

    const logX = (relativeX / bounds.width) * 800;
    const logY = (relativeY / bounds.height) * 450;
    return { x: logX, y: logY };
  };

  const handlePointerDown = (clientX: number, clientY: number) => {
    const coords = convertEventToLogicalCoords(clientX, clientY);
    if (!coords) return;

    const hitSensor = sensorsRef.current.find(s => {
      const distance = Math.sqrt(Math.pow(s.x - coords.x, 2) + Math.pow(s.y - coords.y, 2));
      return distance <= 35;
    });

    if (hitSensor) {
      draggingSensorIdRef.current = hitSensor.id;
      dragCoordsRef.current = { x: coords.x, y: coords.y };
      setSelectedSensorId(hitSensor.id);
      setActiveTab('controls');
    }
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (draggingSensorIdRef.current === null) return;
    const coords = convertEventToLogicalCoords(clientX, clientY);
    if (!coords) return;

    const boundedX = Math.max(32, Math.min(800 - 32, coords.x));
    const boundedY = Math.max(32, Math.min(450 - 32, coords.y));

    dragCoordsRef.current = { x: boundedX, y: boundedY };
  };

  const handlePointerUp = () => {
    if (draggingSensorIdRef.current !== null && dragCoordsRef.current) {
      const finishedId = draggingSensorIdRef.current;
      const finalCoords = { ...dragCoordsRef.current };

      setSensors(prev => prev.map(s => {
        if (s.id === finishedId) {
          return {
            ...s,
            x: finalCoords.x,
            y: finalCoords.y,
            baseX: finalCoords.x,
            baseY: finalCoords.y
          };
        }
        return s;
      }));
    }
    draggingSensorIdRef.current = null;
    dragCoordsRef.current = null;
  };

  // Synchronize target probe properties configuration edits from UI sidebar panel
  const updateSelectedSensorField = (field: keyof SensorData, val: any) => {
    if (selectedSensorId === null) return;
    setSensors(prev => prev.map(s => {
      if (s.id === selectedSensorId) {
        const update: Partial<SensorData> = { [field]: val };
        if (field === 'autonomousMode') {
          update.phase = 0;
          update.baseX = s.x;
          update.baseY = s.y;
        }
        return { ...s, ...update };
      }
      return s;
    }));
  };

  const targetSelectedSensor = sensors.find(s => s.id === selectedSensorId);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen w-full font-sans overflow-hidden bg-stone-950 text-stone-100">
      
      {/* Invisible HTML5 video buffer */}
      <video
        ref={videoRef}
        loop
        muted
        crossOrigin="anonymous"
        className="hidden"
        playsInline
      />
      
      {/* Offscreen rasterization frame */}
      <canvas ref={offscreenCanvasRef} width="800" height="450" className="hidden" />

      {/* --- Top Navigation Bar (Strict 3-zone contract) --- */}
      <header className="flex items-center justify-between gap-4 border-b border-stone-850 bg-stone-900/70 px-5 py-3 backdrop-blur shrink-0 select-none">
        
        {/* Zone 1: Wordmark / Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/20">
            <span className="text-lg">🎵</span>
          </div>
          <div>
            <h1 className="font-display text-base font-bold tracking-tight text-white sm:text-lg">
              Sintetizador Audiovisual Modular
            </h1>
            <p className="font-mono text-[11px] text-stone-400">
              Síntese em tempo real a partir de pixels de vídeo e webcam
            </p>
          </div>
        </div>

        {/* Zone 2: Workspace Actions & Presets */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Preset Selector */}
          <div className="flex items-center gap-1.5 rounded-lg bg-stone-950/70 px-2 py-1 border border-stone-830">
            <span className="font-mono text-[10px] uppercase text-stone-500 tracking-wider">Presets:</span>
            <select
              onChange={(e) => loadPreset(e.target.value)}
              className="bg-transparent text-xs font-medium text-purple-400 focus:outline-none cursor-pointer"
              defaultValue="beat_making"
            >
              <option value="beat_making" className="bg-stone-900 text-stone-200">Caso 1: Criação de Batida (Beat Making)</option>
              <option value="ambient_pad" className="bg-stone-900 text-stone-200">Caso 2: Pad Atmosférico (Ambient)</option>
              <option value="live_performance" className="bg-stone-900 text-stone-200">Caso 3: Performance ao Vivo</option>
              <option value="experimentation" className="bg-stone-900 text-stone-200">Caso 4: Exploração Experimental</option>
              <option value="music_video" className="bg-stone-900 text-stone-200">Caso 5: Sincronização com Clipes</option>
            </select>
          </div>

          {/* Core sensors operations */}
          <div className="flex items-center rounded-lg bg-stone-950/70 p-1 border border-stone-830">
            <button
              onClick={addSensor}
              disabled={sensors.length >= 16}
              className="flex h-7 items-center gap-1 rounded bg-purple-500/10 px-2.5 text-xs font-semibold text-purple-400 hover:bg-purple-500/20 disabled:opacity-30 transition cursor-pointer"
              title="Adicionar Sensor (máx. 16)"
            >
              <Plus className="h-4 w-4" />
              <span>Sensor</span>
            </button>
            <div className="mx-1 h-3.5 w-[1px] bg-stone-800" />
            <button
              onClick={removeLastSensor}
              disabled={sensors.length <= 1}
              className="flex h-7 items-center justify-center rounded px-2 text-xs font-semibold text-stone-400 hover:text-red-400 disabled:opacity-30 transition cursor-pointer"
              title="Remover Último Sensor"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>

          {/* Random explorer trigger */}
          <button
            onClick={triggerRandomization}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-stone-800 hover:border-purple-500/30 px-3 text-xs font-semibold text-stone-300 hover:text-purple-400 transition cursor-pointer"
            title="Sorteio Aleatório de Configurações"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Aleatório</span>
          </button>

          {/* Audio Engine contextual activation warning */}
          {!audioContextActive && (
            <button
              onClick={togglePlay}
              className="animate-pulse flex h-8 items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 text-xs font-semibold text-amber-500 hover:bg-amber-500/20 cursor-pointer"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>Ativar Áudio</span>
            </button>
          )}

          {/* Help modal button */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-800 hover:text-purple-400 text-stone-400 transition cursor-pointer"
            title="Manual e Instruções"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>

        {/* Zone 3: Export & Recording Controls */}
        <div className="flex items-center gap-2">
          {recordingMode === 'none' ? (
            <>
              {/* Record Video WebM Button */}
              <button
                onClick={startVideoRecording}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-stone-800 bg-stone-900/90 hover:border-red-500/40 px-3 text-xs font-semibold text-stone-300 hover:text-red-400 transition cursor-pointer"
                title="Gravar Vídeo do Visualizador com Áudio Sincronizado (WebM)"
              >
                <Radio className="h-3.5 w-3.5 text-red-500" />
                <span className="hidden sm:inline">Gravar Vídeo</span>
              </button>

              {/* Record Pure Audio WAV Button */}
              <button
                onClick={startAudioWavRecording}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-stone-800 bg-stone-900/90 hover:border-purple-500/40 px-3 text-xs font-semibold text-stone-300 hover:text-purple-400 transition cursor-pointer"
                title="Exportar Somente Áudio em formato WAV Estéreo PCM"
              >
                <FileAudio className="h-3.5 w-3.5 text-purple-400" />
                <span className="hidden sm:inline">Exportar WAV</span>
              </button>
            </>
          ) : (
            /* Stop active recording */
            <button
              onClick={recordingMode === 'video' ? stopVideoRecording : stopAudioWavRecording}
              className="flex h-8 items-center gap-2 rounded-lg bg-red-600 px-3.5 text-xs font-bold text-white shadow-lg shadow-red-600/30 animate-pulse cursor-pointer"
            >
              <span className="h-2 w-2 rounded-full bg-white" />
              <span>
                Parar ({recordingMode === 'video' ? 'Vídeo' : 'WAV'} {formatSeconds(recordingSeconds)})
              </span>
            </button>
          )}
        </div>
      </header>

      {/* --- Harmonic & Rhythmic Master Control Bar --- */}
      <section className="bg-stone-900/90 border-b border-stone-850 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none backdrop-blur-md shrink-0">
        
        {/* Left side: Tônica Fundamental & Escala Musical */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Tônica (Root Key) */}
          <div className="flex items-center gap-1.5 bg-stone-950 px-2.5 py-1.5 rounded-lg border border-stone-830">
            <Music className="h-3.5 w-3.5 text-purple-400" />
            <span className="font-mono text-[10px] uppercase text-stone-400 font-bold">Tônica:</span>
            <select
              value={rootKey}
              onChange={(e) => handleRootKeyChange(e.target.value)}
              className="bg-transparent text-purple-300 font-bold focus:outline-none cursor-pointer"
            >
              {CHROMATIC_ROOTS.map(r => (
                <option key={r.val} value={r.val} className="bg-stone-900 text-stone-200">
                  {r.pt} ({r.val})
                </option>
              ))}
            </select>
          </div>

          {/* Escala Musical */}
          <div className="flex items-center gap-1.5 bg-stone-950 px-2.5 py-1.5 rounded-lg border border-stone-830">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span className="font-mono text-[10px] uppercase text-stone-400 font-bold">Escala:</span>
            <select
              value={selectedScale}
              onChange={(e) => handleScaleChange(e.target.value)}
              className="bg-transparent text-purple-300 font-semibold focus:outline-none cursor-pointer max-w-[210px] truncate"
            >
              {Object.entries(SCALE_TEMPLATES).map(([key, tmpl]) => (
                <option key={key} value={key} className="bg-stone-900 text-stone-200">
                  {tmpl.name}
                </option>
              ))}
            </select>
          </div>

          {/* Live Collective Chord Display */}
          <div className="hidden md:flex items-center gap-1.5 bg-stone-950/80 px-2.5 py-1.5 rounded-lg border border-stone-830 font-mono text-[10px]">
            <span className="uppercase text-stone-500 font-bold">Acorde Ativo:</span>
            <span className="text-purple-300 font-semibold tabular-nums">
              {isPlaying && telemetry.activeChordNotes.length > 0
                ? telemetry.activeChordNotes.join(' · ')
                : 'Em Repouso'}
            </span>
          </div>
        </div>

        {/* Center / Right: Master BPM Clock, Organic Groove & Optical Inertia */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Master BPM & Tap */}
          <div className="flex items-center gap-2 bg-stone-950 px-2.5 py-1.5 rounded-lg border border-stone-830">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase text-stone-400 font-bold">BPM:</span>
              <span className="font-mono text-purple-300 font-bold tabular-nums min-w-[30px]">{bpm}</span>
            </div>
            
            <input
              type="range"
              min="50"
              max="180"
              step="1"
              value={bpm}
              onChange={(e) => handleBpmChange(parseInt(e.target.value))}
              className="w-16 cursor-pointer h-1 bg-stone-800 rounded appearance-none accent-purple-500"
              title="Ajustar Andamento (BPM)"
            />

            <button
              onClick={handleTapTempo}
              className="px-2 py-0.5 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold transition cursor-pointer whitespace-nowrap"
              title="Clique no ritmo desejado para calcular o BPM automaticamente"
            >
              TAP
            </button>
          </div>

          {/* Organic Groove / Micro-fluctuation */}
          <div className="flex items-center gap-2 bg-stone-950 px-2.5 py-1.5 rounded-lg border border-stone-830">
            <Activity className="h-3.5 w-3.5 text-purple-400" />
            <span className="font-mono text-[10px] uppercase text-stone-400 font-bold">Groove:</span>
            <span className="font-mono text-purple-300 font-bold tabular-nums min-w-[30px]">{groove}%</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={groove}
              onChange={(e) => handleGrooveChange(parseInt(e.target.value))}
              className="w-14 cursor-pointer h-1 bg-stone-800 rounded appearance-none accent-purple-500"
              title="Micro-flutuação e balanço orgânico humano (0% rígido a 100% swing)"
            />
          </div>

          {/* Optical Inertia & Note Sustain */}
          <div className="flex items-center gap-2 bg-stone-950 px-2.5 py-1.5 rounded-lg border border-stone-830">
            <Compass className="h-3.5 w-3.5 text-purple-400" />
            <span className="font-mono text-[10px] uppercase text-stone-400 font-bold">Inércia & Sustentação:</span>
            <span className="font-mono text-purple-300 font-bold tabular-nums min-w-[30px]">{inertia}%</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={inertia}
              onChange={(e) => handleInertiaChange(parseInt(e.target.value))}
              className="w-16 cursor-pointer h-1 bg-stone-800 rounded appearance-none accent-purple-500"
              title="Suavização óptica e tempo mínimo de sustentação de cada nota/drone (evita saltos bruscos)"
            />
          </div>

        </div>

      </section>

      {/* Mobile/Tablet Tab Switcher */}
      <div className="flex lg:hidden bg-stone-900/60 border-b border-stone-850 p-2 gap-2 select-none shrink-0">
        <button
          onClick={() => setActiveTab('visualizer')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg tracking-wide transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'visualizer'
              ? 'bg-purple-500/15 text-purple-400 font-bold'
              : 'bg-stone-950/40 text-stone-400 hover:text-white'
          }`}
        >
          <span>📺 Visualizador & Vídeo</span>
        </button>
        <button
          onClick={() => setActiveTab('controls')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg tracking-wide transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'controls'
              ? 'bg-purple-500/15 text-purple-400 font-bold'
              : 'bg-stone-950/40 text-stone-400 hover:text-white'
          }`}
        >
          <span>🎛️ Painel do Sensor</span>
        </button>
      </div>

      {/* --- Main Dashboard Area --- */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 bg-stone-950">

        {/* --- Left Board: Canvas + Feeder Sources Deck --- */}
        <section className={`flex-1 flex flex-col p-4 gap-3.5 min-h-0 ${activeTab === 'visualizer' ? 'flex' : 'hidden lg:flex'}`}>
          
          {/* Visual Board Canvas */}
          <div className="flex-1 flex items-center justify-center relative bg-stone-900 border border-stone-850 rounded-2xl overflow-hidden shadow-2xl">
            <div className="relative w-full max-w-4xl aspect-[16/9] bg-black shadow-inner">
              <canvas
                ref={canvasRef}
                width="800"
                height="450"
                className="absolute inset-0 w-full h-full cursor-crosshair z-10 select-none"
                onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
                onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  handlePointerDown(touch.clientX, touch.clientY);
                }}
                onTouchMove={(e) => {
                  const touch = e.touches[0];
                  handlePointerMove(touch.clientX, touch.clientY);
                }}
                onTouchEnd={handlePointerUp}
              />

              {/* Pause overlay banner */}
              {!isPlaying && (
                <div 
                  onClick={togglePlay}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20 p-6 text-center select-none cursor-pointer group"
                >
                  <div className="h-14 w-14 rounded-full flex items-center justify-center bg-purple-500/20 text-purple-400 mb-3 group-hover:scale-105 transition-transform">
                    <Play className="h-7 w-7 ml-1 text-purple-400" />
                  </div>
                  <p className="font-display font-bold text-lg text-white">Sintetizador Pronto</p>
                  <p className="text-xs text-stone-400 mt-1 max-w-xs">
                    Clique aqui ou no botão de Play para iniciar o som e os movimentos ópticos!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom video feeds & playback controller */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-stone-900/50 border border-stone-850 rounded-xl p-3 shrink-0">
            
            {/* Play/Pause Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className={`flex h-11 w-11 items-center justify-center rounded-xl font-bold transition shadow-md cursor-pointer ${
                  isPlaying 
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20' 
                    : 'bg-white hover:bg-stone-200 text-black'
                }`}
                title={isPlaying ? 'Pausar Síntese' : 'Iniciar Síntese'}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </button>

              <div className="text-left">
                <span className="block font-mono text-[9px] uppercase text-stone-500 tracking-wider">Status:</span>
                <span className="font-semibold text-xs text-white">
                  {isPlaying ? 'Reproduzindo Som & Vídeo' : 'Sintetizador Pausado'}
                </span>
              </div>
            </div>

            {/* Video Source Selectors */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Webcam Button */}
              <button
                onClick={() => selectVideoSource(videoSource === 'webcam' ? 'generator' : 'webcam')}
                className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold border transition cursor-pointer ${
                  videoSource === 'webcam'
                    ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20'
                    : 'bg-stone-950 border-stone-830 text-stone-300 hover:text-white hover:border-purple-500/40'
                }`}
                title="Ativar Webcam ao Vivo como Fonte de Imagem"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Webcam ao Vivo</span>
              </button>

              {/* Video Source Dropdown */}
              <div className="flex items-center gap-1 bg-stone-950 px-2 py-1 rounded-lg border border-stone-830">
                <Video className="h-3.5 w-3.5 text-stone-400 mr-1" />
                <span className="font-mono text-[9px] uppercase text-stone-500 mr-1.5">Fonte:</span>
                
                <select
                  value={videoSource}
                  onChange={(e) => selectVideoSource(e.target.value)}
                  className="bg-transparent text-xs text-stone-200 focus:outline-none cursor-pointer max-w-[210px] truncate"
                >
                  <option value="generator" className="bg-stone-900 text-stone-200">Visualizador Generativo (Interno)</option>
                  <option value="webcam" className="bg-stone-900 text-stone-200">Câmera ao Vivo (Webcam)</option>
                  {DEMO_VIDEOS.map(v => (
                    <option key={v.id} value={v.url} className="bg-stone-900 text-stone-200">{v.name}</option>
                  ))}
                </select>
              </div>

              {/* Uploader section */}
              <label className="flex h-8 items-center justify-center gap-1.5 border border-dashed border-stone-800 hover:border-purple-500/40 rounded-lg px-3 cursor-pointer text-xs font-semibold text-stone-400 hover:text-white transition">
                <Download className="h-3.5 w-3.5 rotate-180 text-stone-400" />
                <span>Arquivo Local</span>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/ogg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Webcam Error alert banner if any */}
          {webcamError && (
            <div className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 text-xs text-red-400">
              <span>{webcamError}</span>
              <button onClick={() => setWebcamError(null)} className="text-red-400 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </section>

        {/* --- Right Board: Selected Probe Side Control Board --- */}
        <section className={`w-full lg:w-96 flex flex-col border-t lg:border-t-0 lg:border-l border-stone-850 bg-stone-900/30 p-4 gap-4 overflow-y-auto ${activeTab === 'controls' ? 'flex' : 'hidden lg:flex'}`}>
          
          <div className="flex items-center justify-between border-b border-stone-850 pb-3 shrink-0">
            <h2 className="flex items-center gap-2 font-display text-sm font-bold text-white">
              <Sliders className="h-4 w-4 text-purple-400" />
              Painel Lateral do Sensor
            </h2>
            <span className="font-mono text-xs bg-stone-950 px-2 py-0.5 border border-stone-830 rounded text-stone-400">
              {sensors.length} Ativo(s)
            </span>
          </div>

          {/* --- Global Synthesizer Controls Block --- */}
          <div className="shrink-0 flex flex-col gap-3.5 bg-stone-900/80 p-4 border border-stone-800 rounded-xl relative overflow-hidden shadow-lg">
            <button 
              onClick={() => setIsGlobalAudioExpanded(!isGlobalAudioExpanded)}
              className="flex items-center justify-between w-full text-left bg-transparent border-none p-0 focus:outline-none cursor-pointer group select-none"
              title="Clique para expandir/recolher controles globais"
            >
              <div className="flex items-center gap-2">
                <span className="font-display text-xs uppercase tracking-wider text-purple-400 font-bold group-hover:text-purple-300 transition">
                  Coordenação de Áudio Global
                </span>
              </div>
              <ChevronDown className={`h-4 w-4 text-purple-400 transition-transform duration-200 ${isGlobalAudioExpanded ? 'rotate-180' : ''}`} />
            </button>
            
            {isGlobalAudioExpanded && (
              <div className="flex flex-col gap-3.5 mt-1 border-t border-stone-800/60 pt-3">
                
                {/* 1. Collective Musical Scale Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-display text-xs font-semibold text-stone-300">
                    Escala Musical Coletiva
                  </label>
                  <select
                    value={selectedScale}
                    onChange={(e) => handleScaleChange(e.target.value)}
                    className="w-full bg-stone-950 p-2.5 rounded-lg border border-stone-800 text-xs text-stone-100 hover:border-purple-500/50 focus:border-purple-500 focus:outline-none cursor-pointer font-medium transition"
                  >
                    {Object.entries(SCALE_TEMPLATES).map(([key, tmpl]) => (
                      <option key={key} value={key} className="bg-stone-950 text-stone-100">
                        {tmpl.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* --- Musical Scale Editor --- */}
                <div className="flex flex-col gap-2.5 bg-stone-950/60 p-2.5 rounded-lg border border-stone-800/60">
                  <div className="flex items-center justify-between border-b border-stone-800/40 pb-1.5">
                    <span className="font-mono text-[9px] text-purple-400 font-bold uppercase tracking-wider">
                      Editor de Notas por Escala
                    </span>
                    <span className="font-mono text-[9px] text-stone-500">
                      Personalizável
                    </span>
                  </div>
                  
                  {(['lead', 'bass', 'kick'] as const).map(cat => {
                    const activeScaleKey = selectedScale && SCALES[selectedScale] ? selectedScale : 'minor_pentatonic';
                    const notes = SCALES[activeScaleKey]?.[cat] || [];
                    return (
                      <div key={cat} className="flex flex-col gap-1 border-b border-stone-900/60 last:border-none pb-1.5 last:pb-0">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="capitalize text-stone-300">
                            {cat === 'lead' ? 'Melodia (Lead)' : cat === 'bass' ? 'Baixo (Bass)' : 'Bumbo (Kick)'}
                          </span>
                          <span className="font-mono text-[9px] text-stone-500">{notes.length} notas</span>
                        </div>

                        <div className="flex flex-wrap gap-1 items-center">
                          {notes.map((n, i) => (
                            <span 
                              key={`${n}-${i}-${scaleVersion}`}
                              onClick={() => handleRemoveScaleNote(activeScaleKey, cat, i)}
                              title="Clique para apagar esta nota"
                              className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-mono cursor-pointer hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/20 transition flex items-center gap-1"
                            >
                              {n}
                              <span className="opacity-60 text-[8px]">×</span>
                            </span>
                          ))}
                          
                          <select 
                            value=""
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                handleAddScaleNote(activeScaleKey, cat, val);
                              }
                            }}
                            className="bg-stone-950 border border-stone-800 hover:border-stone-700 transition rounded px-1.5 py-0.5 text-[10px] font-mono text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                          >
                            <option value="">+ Nota...</option>
                            {getAvailableNotesForCategory(cat).map(opt => (
                              <option key={opt.val} value={opt.val} className="text-xs bg-stone-900">
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reverb controls */}
                <div className="flex flex-col gap-1.5 border-t border-stone-800/40 pt-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-300">
                    <span>Espaço de Reverb</span>
                    <span className="font-mono text-purple-400 font-bold">{globalReverb}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={globalReverb}
                    onChange={(e) => setGlobalReverb(parseInt(e.target.value))}
                    className="w-full cursor-pointer h-1.5 bg-stone-950 rounded-lg appearance-none accent-purple-500"
                  />
                  <div className="flex justify-between font-mono text-[9px] text-stone-600">
                    <span>Seco</span>
                    <span>Ambiente</span>
                    <span>Lavado (100%)</span>
                  </div>
                </div>

                {/* Sensors Visibility control */}
                <div className="flex flex-col gap-1.5 border-t border-stone-800/40 pt-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-300">
                    <span>Visibilidade dos Sensores</span>
                    <span className="font-mono text-purple-400 font-bold">{globalSensorOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={globalSensorOpacity}
                    onChange={(e) => setGlobalSensorOpacity(parseInt(e.target.value))}
                    className="w-full cursor-pointer h-1.5 bg-stone-950 rounded-lg appearance-none accent-purple-500"
                  />
                  <div className="flex justify-between font-mono text-[9px] text-stone-600">
                    <span>Oculto (0%)</span>
                    <span>Translúcido</span>
                    <span>Opaco (100%)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* --- Individual Target Sensor Configuration Card --- */}
          {targetSelectedSensor ? (
            <div className="shrink-0 flex flex-col gap-4 flex-1">
              
              {/* Sensor Header Overview with Live Telemetry */}
              <div className="flex items-center gap-3 bg-stone-950/70 border border-stone-830 rounded-xl p-3">
                <div 
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-white border border-white/20 select-none font-mono font-bold shadow-sm"
                  style={{ backgroundColor: telemetry.selectedColor }}
                >
                  S{targetSelectedSensor.id}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">
                      Sensor S{targetSelectedSensor.id} · <span className="text-purple-400 font-mono">{telemetry.selectedNotePt}</span>
                    </span>
                    <span className="font-mono text-[10px] text-stone-500 tabular-nums">
                      X:{telemetry.selectedX} Y:{telemetry.selectedY}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1.5 font-mono text-[10px] tabular-nums">
                    <div className="flex items-center gap-1.5 text-stone-400">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: telemetry.selectedColor }} />
                      <span>H:{telemetry.selectedH}° S:{telemetry.selectedS}% L:{telemetry.selectedL}%</span>
                    </div>
                    <span className="text-purple-300 font-semibold">
                      Pan: {telemetry.selectedPan < -0.1 ? `L ${Math.round(Math.abs(telemetry.selectedPan) * 100)}%` : telemetry.selectedPan > 0.1 ? `R ${Math.round(telemetry.selectedPan * 100)}%` : 'Centro'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 1. Tipo de Instrumento */}
              <div className="flex flex-col gap-1.5">
                <label className="font-display text-xs font-semibold text-stone-300">
                  1. Instrumento de Síntese
                </label>
                <select
                  value={targetSelectedSensor.instrument}
                  onChange={(e) => updateSelectedSensorField('instrument', e.target.value as InstrumentType)}
                  className="w-full bg-stone-950 p-2.5 rounded-lg border border-stone-830 text-xs text-white focus:border-purple-500 focus:outline-none cursor-pointer"
                >
                  <option value="kick">KICK (Bumbo / Percussão Grave - MembraneSynth)</option>
                  <option value="hihat">HI-HAT (Chimbal Metálico Percussivo - MetalSynth)</option>
                  <option value="bass">BASS (Contrabaixo Onda Quadrada - MonoSynth)</option>
                  <option value="lead">LEAD (Melodia Expressiva Harmônica - FMSynth)</option>
                </select>
              </div>

              {/* 2. Modo de Reprodução */}
              <div className="flex flex-col gap-1.5">
                <label className="font-display text-xs font-semibold text-stone-300">
                  2. Modo Sonoro
                </label>
                <div className="grid grid-cols-2 gap-2 bg-stone-950 p-1 border border-stone-830 rounded-lg">
                  <button
                    onClick={() => updateSelectedSensorField('mode', 'rhythmic')}
                    className={`py-2 text-xs font-semibold rounded-md transition cursor-pointer ${
                      targetSelectedSensor.mode === 'rhythmic'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    Rítmico (Batida)
                  </button>
                  <button
                    onClick={() => updateSelectedSensorField('mode', 'continuous')}
                    className={`py-2 text-xs font-semibold rounded-md transition cursor-pointer ${
                      targetSelectedSensor.mode === 'continuous'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    Contínuo (Drone)
                  </button>
                </div>
              </div>

              {/* 3. Controles de Frequência e Parâmetros */}
              <div className="flex flex-col gap-3.5 border border-stone-850 rounded-xl p-3.5 bg-stone-950/30">
                <span className="font-display text-xs font-semibold text-stone-300 border-b border-stone-850 pb-1.5">
                  3. Parâmetros & Afinação
                </span>

                {/* SENSITIVITY Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between select-none">
                    <span className="text-xs text-stone-400 font-medium">Sensibilidade à Luz</span>
                    <span className="font-mono text-xs text-purple-400 font-semibold">
                      {targetSelectedSensor.sensitivity !== undefined ? targetSelectedSensor.sensitivity : 50}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={targetSelectedSensor.sensitivity !== undefined ? targetSelectedSensor.sensitivity : 50}
                    onChange={(e) => updateSelectedSensorField('sensitivity', parseInt(e.target.value))}
                    className="w-full cursor-pointer h-1.5 bg-stone-900 rounded-lg appearance-none accent-purple-500"
                  />
                  <div className="flex justify-between font-mono text-[9px] text-stone-600 mb-1">
                    <span>Baixa Sens.</span>
                    <span>Padrão</span>
                    <span>Máxima Sens.</span>
                  </div>
                  <button 
                    onClick={() => {
                      const currentVal = targetSelectedSensor.sensitivity !== undefined ? targetSelectedSensor.sensitivity : 50;
                      setSensors(prev => prev.map(s => ({ ...s, sensitivity: currentVal })));
                    }}
                    className="self-end px-2 py-0.5 bg-stone-900 border border-stone-700/50 hover:border-purple-500/50 hover:text-purple-400 text-stone-400 text-[9px] font-mono rounded transition cursor-pointer"
                  >
                    Aplicar a todos
                  </button>
                </div>

                {/* VOLUME Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between select-none">
                    <span className="text-xs text-stone-400 font-medium">Volume</span>
                    <span className="font-mono text-xs text-purple-400 font-semibold">
                      {targetSelectedSensor.volume === -40 ? 'Mudo' : `${targetSelectedSensor.volume} dB`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="10"
                    step="1"
                    value={targetSelectedSensor.volume}
                    onChange={(e) => updateSelectedSensorField('volume', parseInt(e.target.value))}
                    className="w-full cursor-pointer h-1.5 bg-stone-900 rounded-lg appearance-none accent-purple-500"
                  />
                  <div className="flex justify-between font-mono text-[9px] text-stone-600">
                    <span>-40 dB (Mudo)</span>
                    <span>-6 dB (Recomendado)</span>
                    <span>+10 dB</span>
                  </div>
                </div>

                {/* TOM (Diatonic Scale Offset / Octave) Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-400 font-medium">Deslocamento na Escala (Graus)</span>
                    <span className="font-mono text-xs text-purple-400 font-semibold tabular-nums">
                      {targetSelectedSensor.pitch > 0 ? `+${targetSelectedSensor.pitch}` : targetSelectedSensor.pitch}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-24"
                    max="24"
                    step="1"
                    value={targetSelectedSensor.pitch}
                    onChange={(e) => updateSelectedSensorField('pitch', parseInt(e.target.value))}
                    className="w-full cursor-pointer h-1.5 bg-stone-900 rounded-lg appearance-none accent-purple-500"
                  />
                  <div className="flex justify-between font-mono text-[9px] text-stone-600">
                    <span>-2 Oitavas</span>
                    <span>Grau Base (100% na Escala)</span>
                    <span>+2 Oitavas</span>
                  </div>
                </div>

                {/* TIMBRE Envelope Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-400 font-medium">Timbre & Filtro</span>
                    <span className="font-mono text-xs text-purple-400 font-semibold">
                      {targetSelectedSensor.timbre}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={targetSelectedSensor.timbre}
                    onChange={(e) => updateSelectedSensorField('timbre', parseInt(e.target.value))}
                    className="w-full cursor-pointer h-1.5 bg-stone-900 rounded-lg appearance-none accent-purple-500"
                  />
                  <div className="flex justify-between font-mono text-[9px] text-stone-600">
                    <span>Suave (0%)</span>
                    <span>Equilibrado (50%)</span>
                    <span>Modulado (100%)</span>
                  </div>
                </div>
              </div>

              {/* 4. Movimento Autônomo */}
              <div className="flex flex-col gap-1.5">
                <label className="font-display text-xs font-semibold text-stone-300">
                  4. Movimento Autônomo
                </label>
                <select
                  value={targetSelectedSensor.autonomousMode}
                  onChange={(e) => updateSelectedSensorField('autonomousMode', e.target.value as AutonomousMode)}
                  className="w-full bg-stone-950 p-2.5 rounded-lg border border-stone-830 text-xs text-white focus:border-purple-500 focus:outline-none cursor-pointer"
                >
                  <option value="none">Manual (Posicionamento Livre por Arraste)</option>
                  <option value="circular">Órbita Circular (Trajetória Radial de 150px)</option>
                  <option value="dvd">DVD Bounce (Ricochete Contínuo de Bordas)</option>
                  <option value="tracking">Motion Tracking (Perseguir Ponto Mais Brilhante)</option>
                </select>
              </div>

              {/* 5. Controle Arpeggiator */}
              <div className="flex flex-col gap-2.5 border border-stone-850 rounded-xl p-3 bg-stone-950/30">
                <div className="flex items-center justify-between border-b border-stone-850 pb-1.5">
                  <span className="font-display text-xs font-semibold text-stone-300">
                    5. Sequenciador / Arpegiador
                  </span>
                  <button
                    onClick={() => updateSelectedSensorField('arpEnabled', !targetSelectedSensor.arpEnabled)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition cursor-pointer ${
                      targetSelectedSensor.arpEnabled
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'
                    }`}
                  >
                    {targetSelectedSensor.arpEnabled ? 'Ativado' : 'Desativado'}
                  </button>
                </div>

                {targetSelectedSensor.arpEnabled && (
                  <div className="flex flex-col gap-2 mt-1">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-stone-400 font-semibold">Padrão de Passos</span>
                      <select
                        value={targetSelectedSensor.arpPattern || 'up'}
                        onChange={(e) => updateSelectedSensorField('arpPattern', e.target.value as any)}
                        className="w-full bg-stone-950 p-2 rounded-lg border border-stone-830 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                      >
                        <option value="up">Subir (Up)</option>
                        <option value="down">Descer (Down)</option>
                        <option value="random">Aleatório (Random)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-stone-400 font-semibold">Velocidade de Passo</span>
                        <span className="font-mono text-xs text-purple-400 font-bold">
                          {targetSelectedSensor.arpSpeed || 200} ms
                        </span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="800"
                        step="10"
                        value={targetSelectedSensor.arpSpeed || 200}
                        onChange={(e) => updateSelectedSensorField('arpSpeed', parseInt(e.target.value))}
                        className="w-full cursor-pointer h-1.5 bg-stone-900 rounded-lg appearance-none accent-purple-500"
                      />
                      <div className="flex justify-between font-mono text-[9px] text-stone-600">
                        <span>Rápido (60ms)</span>
                        <span>Moderado</span>
                        <span>Lento (800ms)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 6. Deletar Sensor Button */}
              <button
                onClick={() => removeSensor(targetSelectedSensor.id)}
                className="mt-2 w-full py-2.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-400 hover:text-red-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <X className="h-4 w-4" />
                <span>Remover Sensor S{targetSelectedSensor.id}</span>
              </button>

            </div>
          ) : (
            <div className="shrink-0 flex-1 flex flex-col items-center justify-center text-center p-6 bg-stone-950/20 rounded-xl border border-dashed border-stone-850 select-none">
              <Sliders className="h-8 w-8 text-stone-600 mb-2" />
              <p className="text-sm font-semibold text-stone-400">Nenhum Sensor Selecionado</p>
              <p className="text-xs text-stone-500 mt-1 max-w-xs">
                Clique em qualquer um dos círculos sobre o vídeo para ver e ajustar suas configurações de áudio e física.
              </p>
            </div>
          )}
        </section>

      </main>

      {/* --- Guide Help Modal --- */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative select-none">
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-lg font-bold text-white mb-3">Guia do Sintetizador Modular</h3>
            <div className="space-y-3 text-sm text-stone-300 max-h-[70vh] overflow-y-auto pr-1">
              <p>
                O <strong>Sintetizador Audiovisual</strong> converte dados ópticos de vídeo ou webcam em música em tempo real através de sensores virtuais.
              </p>
              <div>
                <strong className="text-purple-400">Sinestesia Harmônica, Inércia & Drones Aveludados:</strong>
                <ul className="list-disc pl-5 text-xs text-stone-400 mt-1 space-y-1">
                  <li><strong>Inércia Óptica & Sustentação:</strong> Suaviza variações bruscas de cor e mantém cada nota sustentada por uma frase musical antes de transicionar.</li>
                  <li><strong>Orquestração em Acordes:</strong> Múltiplos sensores distribuem-se automaticamente em vozes complementares da escala (Tônica, 3ª, 5ª) e toda transposição mantém-se 100% dentro do tom.</li>
                  <li><strong>Modo Contínuo (Velvet Drone):</strong> Possui ciclo lento de respiração orgânica (LFO), repouso suave quando a imagem está estática, harmônicos puros e transições suaves tipo arco (*dip-and-bloom*).</li>
                  <li><strong>Mixagem & Sidechain:</strong> O disparo do Bumbo (*Kick*) atenua sutilmente o barramento de drones e baixos, criando pulsação rítmica coesa e sem fadiga auditiva.</li>
                </ul>
              </div>
              <div>
                <strong className="text-purple-400">Modos de Locomoção:</strong>
                <ul className="list-disc pl-5 text-xs text-stone-400 mt-1 space-y-1">
                  <li><strong>Manual:</strong> Arraste livremente os sensores com o mouse ou dedo.</li>
                  <li><strong>Órbita:</strong> O sensor gira em círculo perfeito ao redor do ponto onde foi solto.</li>
                  <li><strong>DVD Bounce:</strong> Desliza diagonalmente e ricocheteia nas quatro bordas.</li>
                  <li><strong>Motion Tracking:</strong> Persegue em tempo real o ponto mais claro e luminoso do vídeo ou da webcam.</li>
                </ul>
              </div>
              <div>
                <strong className="text-purple-400">Exportação:</strong>
                <ul className="list-disc pl-5 text-xs text-stone-400 mt-1 space-y-1">
                  <li><strong>Gravar Vídeo:</strong> Grava o visualizador e o áudio sincronizados em WebM.</li>
                  <li><strong>Exportar WAV:</strong> Grava o áudio estéreo em alta fidelidade PCM 16-bit.</li>
                </ul>
              </div>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-5 w-full py-2.5 bg-purple-600 text-white font-semibold text-xs rounded-lg hover:bg-purple-500 transition cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* --- Footer Status Bar --- */}
      <footer className="h-10 border-t border-stone-850 bg-stone-950 px-5 flex items-center justify-between select-none shrink-0">
        <div className="flex items-center gap-2 font-mono text-[10px] text-stone-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Motor de Áudio & Visual: 60 FPS Ativo</span>
        </div>

        {/* Global movement progress bar */}
        <div className="flex items-center gap-3 flex-1 max-w-md mx-4">
          <div className="flex items-center gap-1 font-mono text-[10px] uppercase text-purple-400 font-semibold tracking-wide min-w-[120px]">
            <span>Delay Wet:</span>
            <span>{telemetry.globalMovement}%</span>
          </div>
          <div className="flex-1 h-2 bg-stone-900 rounded-full overflow-hidden border border-stone-830/40 relative">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-150 ease-out"
              style={{ width: `${telemetry.globalMovement}%` }}
            />
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-3 font-mono text-[10px] text-stone-500">
          <span>{sensors.length} Sensores</span>
          <span>•</span>
          <span>Tone.js Sintetizador</span>
        </div>
      </footer>

    </div>
  );
}
