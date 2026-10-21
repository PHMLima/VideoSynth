/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Tone from 'tone';
import { InstrumentType, PlaybackMode } from './types';
import { WavRecorder } from './wavRecorder';

export interface ScaleDef {
  name: string;
  kick: string[];
  bass: string[];
  lead: string[];
}

export const CHROMATIC_ROOTS = [
  { val: 'C', pt: 'Dó' },
  { val: 'C#', pt: 'Dó♯' },
  { val: 'D', pt: 'Ré' },
  { val: 'D#', pt: 'Ré♯' },
  { val: 'E', pt: 'Mi' },
  { val: 'F', pt: 'Fá' },
  { val: 'F#', pt: 'Fá♯' },
  { val: 'G', pt: 'Sol' },
  { val: 'G#', pt: 'Sol♯' },
  { val: 'A', pt: 'Lá' },
  { val: 'A#', pt: 'Lá♯' },
  { val: 'B', pt: 'Si' },
];

export const CHROMATIC_PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const NOTE_PT_MAP: Record<string, string> = {
  'C': 'Dó',
  'C#': 'Dó♯',
  'Db': 'Ré♭',
  'D': 'Ré',
  'D#': 'Ré♯',
  'Eb': 'Mi♭',
  'E': 'Mi',
  'F': 'Fá',
  'F#': 'Fá♯',
  'Gb': 'Sol♭',
  'G': 'Sol',
  'G#': 'Sol♯',
  'Ab': 'Lá♭',
  'A': 'Lá',
  'A#': 'Lá♯',
  'Bb': 'Si♭',
  'B': 'Si'
};

/**
 * Formats scientific pitch (e.g. "C#4") into Portuguese musical notation (e.g. "Dó♯4")
 */
export function formatNotePt(noteStr: string): string {
  if (!noteStr) return '';
  const match = noteStr.match(/^([A-G][#b]?)(-?\d+)$/);
  if (!match) return noteStr;
  const [, pitchName, octave] = match;
  const ptName = NOTE_PT_MAP[pitchName] || pitchName;
  return `${ptName}${octave}`;
}

export interface ScaleTemplate {
  name: string;
  intervals: number[]; // semitone offsets from root
  harmonicDegrees: number[]; // indices in intervals prioritizing consonant chord pillars (Root, 5th, 3rd, 7th)
}

export const SCALE_TEMPLATES: Record<string, ScaleTemplate> = {
  minor_pentatonic: {
    name: 'Pentatônica Menor (Sombria & Espacial)',
    intervals: [0, 3, 5, 7, 10],
    harmonicDegrees: [0, 3, 1, 4, 2] // Root, 5th, b3rd, b7th, 4th
  },
  major_pentatonic: {
    name: 'Pentatônica Maior (Brilhante & Alegre)',
    intervals: [0, 2, 4, 7, 9],
    harmonicDegrees: [0, 3, 2, 4, 1] // Root, 5th, 3rd, 6th, 2nd
  },
  dorian: {
    name: 'Dórico (Groove & Místico)',
    intervals: [0, 2, 3, 5, 7, 9, 10],
    harmonicDegrees: [0, 4, 2, 6, 5, 3, 1]
  },
  lydian: {
    name: 'Lídio (Sonhadora & Celestial)',
    intervals: [0, 2, 4, 6, 7, 9, 11],
    harmonicDegrees: [0, 4, 2, 6, 5, 1, 3]
  },
  phrygian_dominant: {
    name: 'Frígio Dominante (Cigana / Mística)',
    intervals: [0, 1, 4, 5, 7, 8, 10],
    harmonicDegrees: [0, 4, 2, 6, 3, 5, 1]
  },
  whole_tone: {
    name: 'Tons Inteiros (Sonhadora & Psicodélica)',
    intervals: [0, 2, 4, 6, 8, 10],
    harmonicDegrees: [0, 2, 4, 1, 3, 5]
  },
  japanese_in_sen: {
    name: 'In Sen Japonesa (Zen Contemplativa)',
    intervals: [0, 1, 5, 7, 10],
    harmonicDegrees: [0, 3, 2, 4, 1]
  },
  harmonic_minor: {
    name: 'Menor Harmônica (Dramática & Clássica)',
    intervals: [0, 2, 3, 5, 7, 8, 11],
    harmonicDegrees: [0, 4, 2, 6, 3, 5, 1]
  }
};

/**
 * Fast RGB to HSL conversion (0-360, 0-100, 0-100)
 */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6;
        break;
      case gNorm:
        h = ((bNorm - rNorm) / d + 2) / 6;
        break;
      case bNorm:
        h = ((rNorm - gNorm) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

export function buildScaleDef(root: string, tmpl: ScaleTemplate): ScaleDef {
  const rootIndex = CHROMATIC_PITCH_NAMES.indexOf(root);
  const baseIndex = rootIndex >= 0 ? rootIndex : 0;

  const getPitch = (interval: number, octave: number) => {
    const totalSemitones = baseIndex + interval;
    const noteName = CHROMATIC_PITCH_NAMES[((totalSemitones % 12) + 12) % 12];
    const oct = octave + Math.floor(totalSemitones / 12);
    return `${noteName}${oct}`;
  };

  // Kick notes (Tônica e Quinta na oitava 1)
  const kickNotes = [getPitch(0, 1)];
  if (tmpl.intervals.length > 3) {
    kickNotes.push(getPitch(tmpl.intervals[3], 1));
  }
  if (tmpl.intervals.length > 1) {
    kickNotes.push(getPitch(tmpl.intervals[1], 1));
  }

  // Bass notes (Oitavas 2 e 3)
  const bassNotes: string[] = [];
  tmpl.intervals.forEach(i => bassNotes.push(getPitch(i, 2)));
  bassNotes.push(getPitch(0, 3));

  // Lead notes (Oitavas 4 e 5)
  const leadNotes: string[] = [];
  tmpl.intervals.forEach(i => leadNotes.push(getPitch(i, 4)));
  leadNotes.push(getPitch(0, 5));

  return {
    name: tmpl.name,
    kick: kickNotes,
    bass: bassNotes,
    lead: leadNotes
  };
}

// Initial populate of SCALES dictionary
export const SCALES: Record<string, ScaleDef> = {};
Object.entries(SCALE_TEMPLATES).forEach(([key, tmpl]) => {
  SCALES[key] = buildScaleDef('C', tmpl);
});

let currentScaleKey = 'minor_pentatonic';
let currentRootKey = 'C';

export interface ColorData {
  r: number;
  g: number;
  b: number;
  brightness: number;
  h?: number;
  s?: number;
  l?: number;
  movement?: number;
}

class VoiceController {
  private sensorId: number;
  private baseSynth: any = null;
  private voiceFilter: Tone.Filter;
  private volumeNode: Tone.Volume;
  private pannerNode: Tone.Panner;
  private currentInstrument: InstrumentType;
  private playbackMode: PlaybackMode;
  private isPlaying: boolean = false;
  private baseVolume: number = -6;
  private currentTimbre: number = 50;

  // Arpeggiator states
  private arpEnabled: boolean = false;
  private arpSpeed: number = 200; // in ms
  private arpPattern: 'up' | 'down' | 'random' = 'up';
  private arpIndex: number = 0;
  private arpIntervalId: any = null;
  private lastColor: ColorData = { r: 128, g: 128, b: 128, brightness: 120, h: 0, s: 50, l: 50, movement: 0 };
  private lastPitchTransposition: number = 0;

  // Optical Inertia, Hysteresis & Velvet Drone States
  private smoothedH: number = 0;
  private smoothedS: number = 50;
  private smoothedL: number = 50;
  private swellEnergy: number = 0.2;
  private breathPhase: number = 0;
  private breathSpeed: number = 0.012;
  private lockedNote: string = '';
  private lockedDegreeIdx: number = 0;
  private noteHoldUntil: number = 0;
  private lastContinuousUpdate: number = 0;

  constructor(sensorId: number, instrument: InstrumentType, mode: PlaybackMode) {
    this.sensorId = sensorId;
    this.currentInstrument = instrument;
    this.playbackMode = mode;

    // Seed unique asynchronous breathing phase and speed per sensor
    this.breathPhase = (sensorId * 1.73) % (Math.PI * 2);
    this.breathSpeed = 0.008 + ((sensorId % 5) * 0.0025);

    this.voiceFilter = new Tone.Filter({
      type: 'lowpass',
      frequency: mode === 'continuous' ? 1100 : 6500,
      rolloff: -24,
      Q: 0.9
    });
    this.volumeNode = new Tone.Volume(-6);
    this.pannerNode = new Tone.Panner(0);

    this.voiceFilter.connect(this.volumeNode);
    this.volumeNode.connect(this.pannerNode);
    this.routePannerToBus();
    this.initSynth();
  }

  private routePannerToBus() {
    try {
      this.pannerNode.disconnect();
      // Continuous voices and melodic instruments go through the warm harmonic sidechain bus
      if (this.playbackMode === 'continuous' || this.currentInstrument === 'bass' || this.currentInstrument === 'lead') {
        this.pannerNode.connect(AudioEngine.getHarmonicBus());
      } else {
        this.pannerNode.connect(AudioEngine.getPercussionBus());
      }
    } catch {}
  }

  public getCurrentNote(): string {
    return this.lockedNote;
  }

  public getBreathValue(): number {
    return (Math.sin(this.breathPhase) + 1) * 0.5;
  }

  private startArpInterval() {
    this.stopArpInterval();
    this.arpIntervalId = setInterval(() => {
      this.playArpStep();
    }, Math.max(60, this.arpSpeed));
  }

  private stopArpInterval() {
    if (this.arpIntervalId) {
      clearInterval(this.arpIntervalId);
      this.arpIntervalId = null;
    }
  }

  private playArpStep() {
    try {
      if (!this.isPlaying || !this.baseSynth) return;

      const scaleDef = SCALES[currentScaleKey] || SCALES.minor_pentatonic;
      let scale = scaleDef.lead;
      if (this.currentInstrument === 'kick') scale = scaleDef.kick;
      else if (this.currentInstrument === 'bass') scale = scaleDef.bass;
      else if (this.currentInstrument === 'hihat') {
        const sat = this.smoothedS;
        const targetRes = 2200 + (sat / 100) * 4500;
        this.baseSynth.resonance = targetRes;
        this.baseSynth.triggerAttackRelease("16n", undefined, 0.35);
        return;
      }

      if (!scale || scale.length === 0) return;

      if (this.arpPattern === 'up') {
        this.arpIndex = (this.arpIndex + 1) % scale.length;
      } else if (this.arpPattern === 'down') {
        this.arpIndex = (this.arpIndex - 1 + scale.length) % scale.length;
      } else if (this.arpPattern === 'random') {
        this.arpIndex = Math.floor(Math.random() * scale.length);
      } else {
        this.arpIndex = (this.arpIndex + 1) % scale.length;
      }

      const finalNote = AudioEngine.resolveDiatonicTransposition(
        scale,
        this.arpIndex,
        this.lastPitchTransposition,
        this.currentInstrument
      );
      this.lockedNote = finalNote;
      AudioEngine.registerVoiceNote(this.sensorId, finalNote, this.arpIndex, this.currentInstrument);

      this.baseSynth.triggerAttackRelease(finalNote, "16n", undefined, 0.55);
    } catch (e) {
      // Soft catch
    }
  }

  public updateSpatial(x: number, _y: number) {
    if (!this.pannerNode) return;
    try {
      const pan = Math.max(-0.92, Math.min(0.92, (x - 400) / 370));
      this.pannerNode.pan.rampTo(pan, 0.06);
    } catch {}
  }

  private initSynth() {
    if (this.baseSynth) {
      try {
        if (typeof this.baseSynth.triggerRelease === 'function') {
          this.baseSynth.triggerRelease();
        }
        this.baseSynth.dispose();
      } catch (e) {
        // Disposed safely
      }
      this.baseSynth = null;
    }

    const isContinuous = this.playbackMode === 'continuous';

    switch (this.currentInstrument) {
      case 'kick':
        if (isContinuous) {
          // Sub-Harmonic Velvet Pedal in Continuous mode
          this.baseSynth = new Tone.MonoSynth({
            oscillator: { type: 'sine' },
            filter: { Q: 1.0, type: 'lowpass', frequency: 140 },
            envelope: { attack: 0.5, decay: 0.8, sustain: 0.85, release: 2.0 },
            filterEnvelope: {
              attack: 0.5,
              decay: 0.8,
              sustain: 0.6,
              release: 1.8,
              baseFrequency: 55,
              octaves: 1.5
            }
          }).connect(this.voiceFilter);
        } else {
          this.baseSynth = new Tone.MembraneSynth({
            envelope: {
              attack: 0.015,
              decay: 0.24,
              sustain: 0.01,
              release: 0.14
            },
            octaves: 5.5,
            pitchDecay: 0.04,
            oscillator: { type: 'sine' }
          }).connect(this.voiceFilter);
        }
        break;

      case 'hihat':
        this.baseSynth = new Tone.MetalSynth({
          envelope: {
            attack: isContinuous ? 0.04 : 0.002,
            decay: isContinuous ? 0.18 : 0.07,
            release: isContinuous ? 0.15 : 0.04
          },
          harmonicity: isContinuous ? 3.0 : 5.1,
          modulationIndex: isContinuous ? 12 : 28,
          resonance: isContinuous ? 2800 : 3800
        }).connect(this.voiceFilter);
        break;

      case 'bass':
        if (isContinuous) {
          // Warm Sub-Bass Pad (Triangle wave, smooth lowpass, zero harsh buzz)
          this.baseSynth = new Tone.MonoSynth({
            oscillator: { type: 'triangle' },
            filter: { Q: 1.2, type: 'lowpass', frequency: 240 },
            envelope: {
              attack: 0.4,
              decay: 0.7,
              sustain: 0.8,
              release: 2.2
            },
            filterEnvelope: {
              attack: 0.45,
              decay: 0.8,
              sustain: 0.5,
              release: 1.8,
              baseFrequency: 85,
              octaves: 2.0,
              exponent: 2
            }
          }).connect(this.voiceFilter);
        } else {
          this.baseSynth = new Tone.MonoSynth({
            oscillator: { type: 'fatsawtooth', count: 2, spread: 12 },
            filter: { Q: 2.2, type: 'lowpass', frequency: 340 },
            envelope: {
              attack: 0.025,
              decay: 0.32,
              sustain: 0.55,
              release: 1.0
            },
            filterEnvelope: {
              attack: 0.03,
              decay: 0.4,
              sustain: 0.4,
              release: 0.9,
              baseFrequency: 100,
              octaves: 3.0,
              exponent: 2
            }
          }).connect(this.voiceFilter);
        }
        break;

      case 'lead':
        if (isContinuous) {
          // Velvet Ambient Pad (Pure integer harmonicity, sine-on-sine, slow bloom)
          this.baseSynth = new Tone.FMSynth({
            harmonicity: 2.0,
            modulationIndex: 2.2,
            oscillator: { type: 'sine' },
            modulation: { type: 'sine' },
            envelope: {
              attack: 0.5,
              decay: 0.9,
              sustain: 0.85,
              release: 2.6
            },
            modulationEnvelope: {
              attack: 0.6,
              decay: 0.8,
              sustain: 0.65,
              release: 2.2
            }
          }).connect(this.voiceFilter);
        } else {
          this.baseSynth = new Tone.FMSynth({
            harmonicity: 2.0,
            modulationIndex: 6,
            oscillator: { type: 'sine' },
            modulation: { type: 'triangle' },
            envelope: {
              attack: 0.04,
              decay: 0.35,
              sustain: 0.65,
              release: 1.4
            },
            modulationEnvelope: {
              attack: 0.05,
              decay: 0.25,
              sustain: 0.5,
              release: 1.1
            }
          }).connect(this.voiceFilter);
        }
        break;
    }

    this.applyTimbre(this.currentTimbre);
  }

  public updateConfig(
    instrument: InstrumentType,
    mode: PlaybackMode,
    volume: number,
    pitch: number,
    timbre: number,
    arpEnabled?: boolean,
    arpSpeed?: number,
    arpPattern?: 'up' | 'down' | 'random'
  ) {
    let reInit = false;
    if (this.currentInstrument !== instrument) {
      this.currentInstrument = instrument;
      reInit = true;
    }

    if (this.playbackMode !== mode) {
      if (this.isPlaying) {
        this.stopContinuous();
      }
      this.playbackMode = mode;
      reInit = true;
    }

    this.baseVolume = volume;
    this.currentTimbre = timbre;
    this.lastPitchTransposition = pitch;

    if (arpEnabled !== undefined) {
      const oldArp = this.arpEnabled;
      this.arpEnabled = arpEnabled;
      if (oldArp && !arpEnabled) {
        this.stopArpInterval();
      } else if (!oldArp && arpEnabled && this.isPlaying && this.playbackMode === 'continuous') {
        this.startArpInterval();
      }
    }
    if (arpSpeed !== undefined) {
      const oldSpeed = this.arpSpeed;
      this.arpSpeed = arpSpeed;
      if (oldSpeed !== arpSpeed && this.arpIntervalId) {
        this.startArpInterval();
      }
    }
    if (arpPattern !== undefined) {
      this.arpPattern = arpPattern;
    }

    if (reInit) {
      this.routePannerToBus();
      this.initSynth();
    } else {
      this.applyTimbre(timbre);
    }

    if (!this.isPlaying || this.playbackMode === 'rhythmic') {
      try {
        const headroom = AudioEngine.getPolyphonicHeadroomDb();
        this.volumeNode.volume.value = volume + headroom;
      } catch (e) {}
    }
  }

  private applyTimbre(pct: number) {
    if (!this.baseSynth) return;
    const isContinuous = this.playbackMode === 'continuous';

    try {
      switch (this.currentInstrument) {
        case 'kick': {
          const kickDecay = 0.08 + (pct / 100) * 0.32;
          if (this.baseSynth.envelope) {
            this.baseSynth.envelope.decay = kickDecay;
          }
          this.voiceFilter.frequency.value = isContinuous ? 130 + (pct / 100) * 160 : 3500;
          break;
        }

        case 'hihat': {
          const hatHarm = isContinuous ? 2.0 + (pct / 100) * 2.0 : 2.5 + (pct / 100) * 6;
          const hatMod = isContinuous ? 6 + (pct / 100) * 18 : 10 + (pct / 100) * 55;
          this.baseSynth.harmonicity = hatHarm;
          this.baseSynth.modulationIndex = hatMod;
          this.voiceFilter.frequency.value = isContinuous ? 1800 + (pct / 100) * 2400 : 7500;
          break;
        }

        case 'bass': {
          const bassQ = isContinuous ? 0.8 + (pct / 100) * 1.8 : 1.2 + (pct / 100) * 4.5;
          const octaves = isContinuous ? 1.0 + (pct / 100) * 1.8 : 1.5 + (pct / 100) * 3.5;
          if (this.baseSynth.filter) {
            this.baseSynth.filter.Q.value = bassQ;
          }
          if (this.baseSynth.filterEnvelope) {
            this.baseSynth.filterEnvelope.octaves = octaves;
          }
          if (!isContinuous) {
            this.voiceFilter.frequency.value = 1800 + (pct / 100) * 2200;
          }
          break;
        }

        case 'lead': {
          // Keep FM modulation gentle in continuous mode so it stays warm and velvety
          const leadMod = isContinuous ? 0.8 + (pct / 100) * 4.2 : 1.5 + (pct / 100) * 18;
          if (this.baseSynth.modulationIndex) {
            this.baseSynth.modulationIndex.value = leadMod;
          }
          if (!isContinuous) {
            this.voiceFilter.frequency.value = 2400 + (pct / 100) * 3800;
          }
          break;
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Smooths incoming optical HSL & movement values based on global Inertia
   */
  private stepOpticalSmoothing(colorData: ColorData) {
    const inertiaPct = AudioEngine.getInertia();
    // Higher inertia = smaller alpha (slower, smoother optical response)
    const alpha = 0.28 - (inertiaPct / 100) * 0.23; // 0.28 (fast) down to 0.05 (very smooth)

    const targetH = colorData.h ?? 0;
    const targetS = colorData.s ?? 50;
    const targetL = colorData.l ?? 50;
    const rawMove = colorData.movement ?? 0;

    // Circular interpolation for Hue (0-360)
    let diffH = targetH - this.smoothedH;
    if (diffH > 180) diffH -= 360;
    if (diffH < -180) diffH += 360;
    this.smoothedH = (this.smoothedH + diffH * alpha + 360) % 360;

    this.smoothedS = this.smoothedS + (targetS - this.smoothedS) * alpha;
    this.smoothedL = this.smoothedL + (targetL - this.smoothedL) * alpha;

    // Swell energy rises quickly on movement and decays gently like a natural breath
    const normalizedMove = Math.min(1.0, rawMove / 28);
    if (normalizedMove > this.swellEnergy) {
      this.swellEnergy = this.swellEnergy * 0.82 + normalizedMove * 0.18;
    } else {
      this.swellEnergy = this.swellEnergy * 0.965 + normalizedMove * 0.035;
    }
  }

  public triggerRhythmic(
    colorData: ColorData,
    pitchTransposition: number,
    x?: number,
    y?: number,
    scheduledTime?: number
  ) {
    if (this.playbackMode !== 'rhythmic' || !this.baseSynth) return;
    this.lastColor = colorData;
    this.lastPitchTransposition = pitchTransposition;
    this.stepOpticalSmoothing(colorData);

    if (x !== undefined && y !== undefined) {
      this.updateSpatial(x, y);
    }

    const s = this.smoothedS;
    const l = this.smoothedL;
    const timeToTrigger = scheduledTime ?? Tone.now();
    const nowMs = Date.now();

    try {
      const scaleDef = SCALES[currentScaleKey] || SCALES.minor_pentatonic;
      let scale = scaleDef.lead;
      if (this.currentInstrument === 'kick') scale = scaleDef.kick;
      else if (this.currentInstrument === 'bass') scale = scaleDef.bass;
      else if (this.currentInstrument === 'hihat') {
        const targetRes = 2400 + (s / 100) * 4200;
        this.baseSynth.resonance = targetRes;
        const decayTime = 0.025 + (l / 100) * 0.075;
        if (this.baseSynth.envelope) {
          this.baseSynth.envelope.decay = decayTime;
        }
        const vel = Math.max(0.25, Math.min(0.75, (l / 100) * 0.75));
        this.baseSynth.triggerAttackRelease("16n", timeToTrigger, vel);
        this.lockedNote = 'HH';
        this.isPlaying = true;
        setTimeout(() => { this.isPlaying = false; }, 140);
        return;
      }

      if (!scale || scale.length === 0) return;

      // Trigger Sidechain Ducking when Kick fires
      if (this.currentInstrument === 'kick') {
        AudioEngine.triggerSidechainDuck();
      }

      // Arpeggiator pulse
      if (this.arpEnabled) {
        let delayOffset = 0;
        const beatStepMs = Math.round((60000 / AudioEngine.getBpm()) / 4);
        for (let step = 0; step < 3; step++) {
          setTimeout(() => {
            if (!this.baseSynth) return;
            try {
              let idx = 0;
              if (this.arpPattern === 'up') {
                idx = (this.arpIndex + step) % scale.length;
              } else if (this.arpPattern === 'down') {
                idx = (this.arpIndex - step + scale.length) % scale.length;
              } else {
                idx = Math.floor(Math.random() * scale.length);
              }
              const finalNote = AudioEngine.resolveDiatonicTransposition(
                scale,
                idx,
                pitchTransposition,
                this.currentInstrument
              );
              this.lockedNote = finalNote;
              AudioEngine.registerVoiceNote(this.sensorId, finalNote, idx, this.currentInstrument);
              this.baseSynth.triggerAttackRelease(finalNote, "16n", undefined, 0.55);
            } catch {}
          }, delayOffset);
          delayOffset += Math.max(65, Math.min(160, beatStepMs));
        }
        this.arpIndex = (this.arpIndex + 1) % scale.length;
        this.isPlaying = true;
        setTimeout(() => { this.isPlaying = false; }, 340);
        return;
      }

      // Note Sustain Hold & Collective Chord Coordination
      let finalNote = this.lockedNote;
      const minHoldMs = 150 + (AudioEngine.getInertia() / 100) * 550;

      if (!finalNote || nowMs >= this.noteHoldUntil) {
        const resolved = AudioEngine.selectCoordinatedChordNote(
          this.sensorId,
          this.currentInstrument,
          scale,
          this.smoothedH,
          this.smoothedS,
          pitchTransposition,
          y
        );
        finalNote = resolved.note;
        this.lockedNote = finalNote;
        this.lockedDegreeIdx = resolved.degreeIdx;
        this.noteHoldUntil = nowMs + minHoldMs;
      }

      AudioEngine.registerVoiceNote(this.sensorId, finalNote, this.lockedDegreeIdx, this.currentInstrument);

      const velocity = Math.max(0.3, Math.min(0.88, 0.25 + (l / 100) * 0.65));
      const headroom = AudioEngine.getPolyphonicHeadroomDb();
      this.volumeNode.volume.rampTo(this.baseVolume + headroom, 0.03);

      this.baseSynth.triggerAttackRelease(finalNote, "8n", timeToTrigger, velocity);
      this.isPlaying = true;
      setTimeout(() => { this.isPlaying = false; }, 140);
    } catch (e) {
      try {
        this.baseSynth.triggerAttackRelease("C3", "8n", timeToTrigger, 0.5);
      } catch {}
    }
  }

  /**
   * Redesigned Velvet Continuous (Drone) Engine:
   * - Asynchronous organic breathing LFO
   * - Motion-coupled swell (rests softly when static, blooms on visual movement)
   * - Note hold hysteresis & Dip-and-Bloom transitions (no siren glissando)
   * - Pure consonant harmonicity ratios (zero harsh metallic FM sidebands)
   */
  public updateContinuous(
    colorData: ColorData,
    pitchTransposition: number,
    x?: number,
    y?: number
  ) {
    if (this.playbackMode !== 'continuous' || !this.baseSynth) {
      if (this.isPlaying) this.stopContinuous();
      return;
    }

    this.lastColor = colorData;
    this.lastPitchTransposition = pitchTransposition;
    this.stepOpticalSmoothing(colorData);

    if (x !== undefined && y !== undefined) {
      this.updateSpatial(x, y);
    }

    const { brightness } = colorData;
    const s = this.smoothedS;
    const l = this.smoothedL;
    const nowMs = Date.now();

    // Advance slow organic breathing phase
    this.breathPhase = (this.breathPhase + this.breathSpeed) % (Math.PI * 2);
    const breathSin = Math.sin(this.breathPhase); // -1.0 to +1.0
    const breathNorm = (breathSin + 1) * 0.5; // 0.0 to 1.0

    // Minimum light threshold: fade smoothly into silence in dark areas
    if (brightness < 6 || l < 5) {
      if (this.isPlaying) {
        if (this.arpEnabled) {
          this.stopContinuous();
        } else {
          try {
            this.volumeNode.volume.rampTo(-60, 0.25);
          } catch {}
        }
      }
      return;
    }

    // Calculate refined non-fatiguing drone gain:
    // - Base offset (-5 dB quieter than transient peaks to sit as a warm bed)
    // - Motion-coupled swell: rests -6.5 dB lower when static, blooms up when movement occurs
    // - Organic breathing undulation (+/- 2.2 dB)
    // - Polyphonic headroom compensation
    const headroom = AudioEngine.getPolyphonicHeadroomDb();
    const lightGain = ((l / 100) - 0.5) * 8; // -4 to +4 dB
    const motionBloomDb = (this.swellEnergy - 0.7) * 7.5; // -5.25 dB at rest, up to +2.25 dB in motion
    const breathDb = breathSin * 2.2;
    const hihatOffset = this.currentInstrument === 'hihat' ? -15 : -4.5;

    const targetVolume = Math.max(
      -52,
      Math.min(4, this.baseVolume + hihatOffset + headroom + lightGain + motionBloomDb + breathDb)
    );

    if (this.arpEnabled) {
      if (!this.isPlaying) {
        this.isPlaying = true;
        this.volumeNode.volume.value = targetVolume;
        this.startArpInterval();
      } else {
        this.volumeNode.volume.rampTo(targetVolume, 0.12);
      }
      return;
    }

    const scaleDef = SCALES[currentScaleKey] || SCALES.minor_pentatonic;
    let scale = scaleDef.lead;
    if (this.currentInstrument === 'kick') scale = scaleDef.kick;
    else if (this.currentInstrument === 'bass') scale = scaleDef.bass;

    // Note Hold Hysteresis: drones sustain their chord tone for a musical phrase
    // before transitioning, preventing chaotic siren glissandos
    const inertiaPct = AudioEngine.getInertia();
    const minDroneHoldMs = 550 + (inertiaPct / 100) * 1250; // 550ms up to 1.8s sustain lock
    let noteChanged = false;

    if (!this.lockedNote || nowMs >= this.noteHoldUntil) {
      const candidate = AudioEngine.selectCoordinatedChordNote(
        this.sensorId,
        this.currentInstrument,
        scale,
        this.smoothedH,
        this.smoothedS,
        pitchTransposition,
        y
      );

      if (candidate.note !== this.lockedNote) {
        noteChanged = this.lockedNote !== '';
        this.lockedNote = candidate.note;
        this.lockedDegreeIdx = candidate.degreeIdx;
        this.noteHoldUntil = nowMs + minDroneHoldMs;
      } else {
        // Extend hold slightly if staying on same note
        this.noteHoldUntil = nowMs + minDroneHoldMs * 0.5;
      }
    }

    AudioEngine.registerVoiceNote(this.sensorId, this.lockedNote, this.lockedDegreeIdx, this.currentInstrument);

    let frequency = 220;
    try {
      frequency = Tone.Frequency(this.lockedNote).toFrequency() as number;
    } catch {
      frequency = 220;
    }

    // Throttle Tone.js parameter ramps to ~25Hz (every 40ms) to avoid WebAudio automation queue buildup
    if (nowMs - this.lastContinuousUpdate < 40 && this.isPlaying && !noteChanged) {
      return;
    }
    this.lastContinuousUpdate = nowMs;

    try {
      // Calculate warm filter cutoff based on instrument, timbre, motion bloom, and breathing LFO
      const timbreFactor = this.currentTimbre / 100;
      const expressionFactor = 0.25 + 0.45 * this.swellEnergy + 0.3 * breathNorm;

      let targetFilterCutoff = 900;
      if (this.currentInstrument === 'bass') {
        targetFilterCutoff = 95 + (timbreFactor * 160) + (expressionFactor * 220) + (s / 100) * 90;
      } else if (this.currentInstrument === 'kick') {
        targetFilterCutoff = 70 + (expressionFactor * 110);
      } else if (this.currentInstrument === 'hihat') {
        targetFilterCutoff = 1200 + (expressionFactor * 1800);
      } else {
        // Lead Velvet Pad: warm lowpass between 380 Hz (at rest) and 1850 Hz (at full bloom)
        targetFilterCutoff = 380 + (timbreFactor * 550) + (expressionFactor * 720) + (s / 100) * 280;
      }

      if (!this.isPlaying) {
        this.volumeNode.volume.value = -60;
        this.voiceFilter.frequency.value = targetFilterCutoff * 0.6;
        this.isPlaying = true;

        if (this.currentInstrument === 'hihat') {
          this.baseSynth.triggerAttack();
        } else {
          this.baseSynth.triggerAttack(frequency);
        }
        this.volumeNode.volume.rampTo(targetVolume, 0.45);
        this.voiceFilter.frequency.rampTo(targetFilterCutoff, 0.45);
      } else {
        if (this.currentInstrument === 'hihat') {
          const targetRes = 1800 + (s / 100) * 3200;
          this.baseSynth.resonance = targetRes;
          this.volumeNode.volume.rampTo(targetVolume, 0.15);
          this.voiceFilter.frequency.rampTo(targetFilterCutoff, 0.15);
        } else if (noteChanged) {
          // Soft "Dip-and-Bloom" bow transition on note change instead of harsh siren slide
          this.voiceFilter.frequency.rampTo(Math.max(90, targetFilterCutoff * 0.58), 0.08);
          this.volumeNode.volume.rampTo(targetVolume - 3.5, 0.08);
          if (this.baseSynth.frequency) {
            this.baseSynth.frequency.rampTo(frequency, 0.18);
          }
          setTimeout(() => {
            if (this.isPlaying && this.voiceFilter && this.volumeNode) {
              try {
                this.voiceFilter.frequency.rampTo(targetFilterCutoff, 0.24);
                this.volumeNode.volume.rampTo(targetVolume, 0.24);
              } catch {}
            }
          }, 90);
        } else {
          this.volumeNode.volume.rampTo(targetVolume, 0.14);
          this.voiceFilter.frequency.rampTo(targetFilterCutoff, 0.14);
        }

        // Pure Harmonicity Ratios on Lead (1.0, 1.5, or 2.0 only - never fractional metallic values)
        if (this.currentInstrument === 'lead' && this.baseSynth.harmonicity) {
          const pureRatios = [1.0, 1.5, 2.0];
          const ratioIdx = s > 75 ? 2 : s > 38 ? 1 : 0;
          this.baseSynth.harmonicity.rampTo(pureRatios[ratioIdx], 0.2);
        }
      }
    } catch (e) {
      // Soft catch
    }
  }

  public stopContinuous() {
    this.stopArpInterval();
    AudioEngine.unregisterVoiceNote(this.sensorId);
    if (!this.isPlaying) return;
    this.isPlaying = false;

    try {
      this.volumeNode.volume.rampTo(-60, 0.22);
    } catch {}

    setTimeout(() => {
      if (!this.isPlaying && this.baseSynth) {
        try {
          if (typeof this.baseSynth.triggerRelease === 'function') {
            this.baseSynth.triggerRelease();
          }
        } catch {}
      }
    }, 240);
  }

  public dispose() {
    this.stopContinuous();
    if (this.baseSynth) {
      try {
        this.baseSynth.dispose();
      } catch {}
      this.baseSynth = null;
    }
    try {
      this.voiceFilter.dispose();
    } catch {}
    try {
      this.volumeNode.dispose();
    } catch {}
    try {
      this.pannerNode.dispose();
    } catch {}
  }
}

interface ActiveVoiceRecord {
  note: string;
  degreeIdx: number;
  instrument: InstrumentType;
  updatedAt: number;
}

export class AudioEngine {
  private static percussionBus: Tone.Gain | null = null;
  private static harmonicBus: Tone.Gain | null = null;
  private static masterWarmFilter: Tone.Filter | null = null;
  private static chorusNode: Tone.Chorus | null = null;
  private static delayNode: Tone.FeedbackDelay | null = null;
  private static reverbNode: Tone.Reverb | null = null;
  private static compressorNode: Tone.Compressor | null = null;
  private static limiterNode: Tone.Limiter | null = null;

  private static voicesStore: Map<number, VoiceController> = new Map();
  private static activeVoiceNotes: Map<number, ActiveVoiceRecord> = new Map();
  private static isInitialized = false;
  private static recordingDestNode: MediaStreamAudioDestinationNode | null = null;
  private static wavRecorder: WavRecorder = new WavRecorder();

  // Musical Master Clock, Groove & Optical Inertia
  private static bpm: number = 100;
  private static groove: number = 30; // 0% (rigid) to 100% (loose swing)
  private static inertia: number = 65; // 0% (instant) to 100% (deep sustain & smooth inertia)
  private static activeSensorCount: number = 4;

  public static initialize() {
    if (this.isInitialized) return;

    this.limiterNode = new Tone.Limiter(-1.2);

    // Gentle glue compressor for cohesive studio soundscape
    this.compressorNode = new Tone.Compressor({
      threshold: -18,
      ratio: 3,
      attack: 0.03,
      release: 0.25
    });

    // Global Delay Node
    this.delayNode = new Tone.FeedbackDelay({
      delayTime: '8n.',
      feedback: 0.28,
      wet: 0.14
    });

    // Reverb Node
    this.reverbNode = new Tone.Reverb({
      decay: 3.0,
      preDelay: 0.04,
      wet: 0.35
    });

    // Analog-style Warm Lowpass & Subtle Stereo Chorus for Melodic/Drone Bus
    this.masterWarmFilter = new Tone.Filter({
      type: 'lowpass',
      frequency: 4800,
      rolloff: -12,
      Q: 0.7
    });

    this.chorusNode = new Tone.Chorus({
      frequency: 0.85,
      delayTime: 3.5,
      depth: 0.22,
      wet: 0.2
    }).start();

    this.percussionBus = new Tone.Gain(1.0);
    this.harmonicBus = new Tone.Gain(1.0);

    // Routing:
    // Percussion -> Delay -> Reverb -> Compressor -> Limiter -> Destination
    // Harmonic/Drones -> Sidechain Gain -> Warm Filter -> Chorus -> Delay -> Reverb -> Compressor -> Limiter
    this.percussionBus.connect(this.delayNode);
    this.harmonicBus.connect(this.masterWarmFilter);
    this.masterWarmFilter.connect(this.chorusNode);
    this.chorusNode.connect(this.delayNode);

    this.delayNode.connect(this.reverbNode);
    this.reverbNode.connect(this.compressorNode);
    this.compressorNode.connect(this.limiterNode);
    this.limiterNode.toDestination();

    Tone.Transport.bpm.value = this.bpm;

    this.setupRecordingDestination();
    this.isInitialized = true;
  }

  private static setupRecordingDestination() {
    try {
      const rawContext = Tone.getContext().rawContext as any;
      if (rawContext && typeof rawContext.createMediaStreamDestination === 'function') {
        this.recordingDestNode = rawContext.createMediaStreamDestination();
        Tone.Destination.connect(this.recordingDestNode as any);
      }
    } catch (e) {
      console.warn("MediaStream destination setup deferred:", e);
    }
  }

  public static getDelayNode(): Tone.FeedbackDelay {
    if (!this.delayNode) {
      this.initialize();
    }
    return this.delayNode!;
  }

  public static getPercussionBus(): Tone.Gain {
    if (!this.percussionBus) {
      this.initialize();
    }
    return this.percussionBus!;
  }

  public static getHarmonicBus(): Tone.Gain {
    if (!this.harmonicBus) {
      this.initialize();
    }
    return this.harmonicBus!;
  }

  public static async startAudioContext(): Promise<void> {
    this.initialize();
    await Tone.start();
    Tone.Transport.start();
    this.setupRecordingDestination();
  }

  // --- Sidechain Ducking & Polyphonic Auto-Gain ---
  public static triggerSidechainDuck() {
    if (!this.harmonicBus) return;
    try {
      const now = Tone.now();
      this.harmonicBus.gain.cancelScheduledValues(now);
      this.harmonicBus.gain.setValueAtTime(this.harmonicBus.gain.value, now);
      // Smooth duck down to 0.58 (-4.7 dB) over 25ms, then organic recovery over 190ms
      this.harmonicBus.gain.linearRampToValueAtTime(0.58, now + 0.025);
      this.harmonicBus.gain.exponentialRampToValueAtTime(1.0, now + 0.215);
    } catch {}
  }

  public static getPolyphonicHeadroomDb(): number {
    // Automatically reduces per-voice gain as more sensors are added so the mix stays clean
    return -1.5 * Math.log2(Math.max(1, this.activeSensorCount));
  }

  // --- Diatonic Transposition & Collective Chord Voicing ---
  public static resolveDiatonicTransposition(
    scale: string[],
    baseDegreeIdx: number,
    pitchOffset: number,
    instrument: InstrumentType
  ): string {
    if (!scale || scale.length === 0) return 'C3';

    // Convert semitone slider (-24 to +24) into diatonic scale steps so notes NEVER leave the scale!
    const uniqueScaleLen = Math.max(1, scale.length - 1); // exclude octave duplicate at end
    const octaveShift = Math.trunc(pitchOffset / 12);
    const remainderSemitones = pitchOffset % 12;
    const diatonicStepShift = Math.round((remainderSemitones / 12) * uniqueScaleLen);

    const totalDegree = baseDegreeIdx + diatonicStepShift;
    const wrappedIdx = ((totalDegree % uniqueScaleLen) + uniqueScaleLen) % uniqueScaleLen;
    const extraOctaves = Math.floor(totalDegree / uniqueScaleLen) + octaveShift;

    const baseNote = scale[wrappedIdx] || scale[0];
    const match = baseNote.match(/^([A-G][#b]?)(-?\d+)$/);
    if (!match) return baseNote;

    const [, noteName, octStr] = match;
    const minOct = instrument === 'kick' ? 1 : instrument === 'bass' ? 1 : 3;
    const maxOct = instrument === 'kick' ? 2 : instrument === 'bass' ? 3 : 5;
    const targetOct = Math.max(minOct, Math.min(maxOct, parseInt(octStr, 10) + extraOctaves));

    return `${noteName}${targetOct}`;
  }

  public static selectCoordinatedChordNote(
    sensorId: number,
    instrument: InstrumentType,
    scale: string[],
    hue: number,
    saturation: number,
    pitchOffset: number,
    y?: number
  ): { note: string; degreeIdx: number } {
    const tmpl = SCALE_TEMPLATES[currentScaleKey] || SCALE_TEMPLATES.minor_pentatonic;
    const uniqueLen = Math.max(1, scale.length - 1);

    // 1. Determine primary degree from Hue and Saturation
    let primaryIdx = 0;
    if (saturation > 55 && tmpl.harmonicDegrees && tmpl.harmonicDegrees.length > 0) {
      const harmPos = Math.floor((hue / 360) * tmpl.harmonicDegrees.length);
      primaryIdx = tmpl.harmonicDegrees[Math.min(harmPos, tmpl.harmonicDegrees.length - 1)] % uniqueLen;
    } else {
      primaryIdx = Math.floor((hue / 360) * uniqueLen) % uniqueLen;
    }

    // 2. Check active voices of other sensors to form complementary chord voicings (Root, 3rd, 5th, 7th)
    const now = Date.now();
    const occupiedDegrees = new Set<number>();
    for (const [otherId, rec] of this.activeVoiceNotes.entries()) {
      if (otherId !== sensorId && now - rec.updatedAt < 1800 && rec.instrument === instrument) {
        occupiedDegrees.add(rec.degreeIdx % uniqueLen);
      }
    }

    let chosenDegree = primaryIdx;
    if (occupiedDegrees.has(chosenDegree) && uniqueLen >= 3) {
      // Shift by a diatonic 3rd (+2 steps) or 5th (+3 steps) to create a consonant chord voicing
      const thirdDegree = (chosenDegree + 2) % uniqueLen;
      const fifthDegree = (chosenDegree + 3) % uniqueLen;
      if (!occupiedDegrees.has(thirdDegree)) {
        chosenDegree = thirdDegree;
      } else if (!occupiedDegrees.has(fifthDegree)) {
        chosenDegree = fifthDegree;
      }
    }

    // 3. Apply vertical position (Y) subtle register offset for Lead only if in upper third
    let effectivePitchOffset = pitchOffset;
    if (instrument === 'lead' && y !== undefined && y < 120 && effectivePitchOffset <= 0) {
      effectivePitchOffset += 7; // Shift up a diatonic fifth in upper canvas region
    }

    const finalNote = this.resolveDiatonicTransposition(scale, chosenDegree, effectivePitchOffset, instrument);
    return { note: finalNote, degreeIdx: chosenDegree };
  }

  public static registerVoiceNote(sensorId: number, note: string, degreeIdx: number, instrument: InstrumentType) {
    if (!note || note === 'HH') return;
    this.activeVoiceNotes.set(sensorId, {
      note,
      degreeIdx,
      instrument,
      updatedAt: Date.now()
    });
  }

  public static unregisterVoiceNote(sensorId: number) {
    this.activeVoiceNotes.delete(sensorId);
  }

  public static getActiveChordNotesPt(): string[] {
    const now = Date.now();
    const uniqueNotes = new Set<string>();
    for (const rec of this.activeVoiceNotes.values()) {
      if (now - rec.updatedAt < 2000 && rec.note) {
        uniqueNotes.add(formatNotePt(rec.note));
      }
    }
    return Array.from(uniqueNotes).slice(0, 6);
  }

  public static getSensorVoiceTelemetry(sensorId: number): { notePt: string; breath: number } {
    const voice = this.voicesStore.get(sensorId);
    if (!voice) return { notePt: '', breath: 0.5 };
    const rawNote = voice.getCurrentNote();
    return {
      notePt: rawNote === 'HH' ? 'Chimbal' : formatNotePt(rawNote),
      breath: voice.getBreathValue()
    };
  }

  // --- Master Clock, Groove & Inertia controls ---
  public static setBpm(newBpm: number) {
    this.bpm = Math.max(50, Math.min(180, newBpm));
    try {
      Tone.Transport.bpm.rampTo(this.bpm, 0.05);
    } catch {}
  }

  public static getBpm(): number {
    return this.bpm;
  }

  public static setGroove(groovePct: number) {
    this.groove = Math.max(0, Math.min(100, groovePct));
  }

  public static getGroove(): number {
    return this.groove;
  }

  public static setInertia(inertiaPct: number) {
    this.inertia = Math.max(0, Math.min(100, inertiaPct));
  }

  public static getInertia(): number {
    return this.inertia;
  }

  // --- Harmonic Key & Scale Management ---
  public static setRootKey(root: string) {
    if (CHROMATIC_PITCH_NAMES.includes(root)) {
      currentRootKey = root;
      Object.entries(SCALE_TEMPLATES).forEach(([key, tmpl]) => {
        SCALES[key] = buildScaleDef(root, tmpl);
      });
    }
  }

  public static getRootKey(): string {
    return currentRootKey;
  }

  public static setScale(scaleKey: string) {
    if (SCALE_TEMPLATES[scaleKey]) {
      currentScaleKey = scaleKey;
      SCALES[scaleKey] = buildScaleDef(currentRootKey, SCALE_TEMPLATES[scaleKey]);
    } else if (SCALES[scaleKey]) {
      currentScaleKey = scaleKey;
    }
  }

  public static getScale(): string {
    return currentScaleKey;
  }

  public static modulateGlobalReverb(wetLevelPct: number) {
    if (!this.reverbNode) return;
    try {
      this.reverbNode.wet.rampTo(wetLevelPct / 100, 0.1);
    } catch (e) {}
  }

  public static updateScaleCategoryNotes(scaleKey: string, category: 'kick' | 'bass' | 'lead', notes: string[]) {
    if (SCALES[scaleKey]) {
      SCALES[scaleKey][category] = notes;
    }
  }

  public static syncSensors(sensors: Array<{
    id: number;
    instrument: InstrumentType;
    mode: PlaybackMode;
    volume: number;
    pitch: number;
    timbre: number;
    arpEnabled?: boolean;
    arpSpeed?: number;
    arpPattern?: 'up' | 'down' | 'random';
    x?: number;
    y?: number;
  }>) {
    this.initialize();
    this.activeSensorCount = Math.max(1, sensors.length);

    const activeIds = new Set(sensors.map(s => s.id));

    for (const [id, voice] of this.voicesStore.entries()) {
      if (!activeIds.has(id)) {
        voice.dispose();
        this.voicesStore.delete(id);
        this.activeVoiceNotes.delete(id);
      }
    }

    for (const s of sensors) {
      let voice = this.voicesStore.get(s.id);
      if (!voice) {
        voice = new VoiceController(s.id, s.instrument, s.mode);
        this.voicesStore.set(s.id, voice);
      }
      voice.updateConfig(s.instrument, s.mode, s.volume, s.pitch, s.timbre, s.arpEnabled, s.arpSpeed, s.arpPattern);
      if (s.x !== undefined && s.y !== undefined) {
        voice.updateSpatial(s.x, s.y);
      }
    }
  }

  /**
   * Quantized rhythmic trigger with organic humanize micro-fluctuation
   */
  public static triggerRhythmicStroke(
    sensorId: number,
    colorData: ColorData,
    pitch: number,
    x?: number,
    y?: number
  ) {
    const voice = this.voicesStore.get(sensorId);
    if (!voice) return;

    const now = Tone.now();
    const beatSec = 60 / this.bpm;
    const sixteenth = beatSec / 4;
    const timeInStep = now % sixteenth;
    const timeUntilNext = sixteenth - timeInStep;

    const maxDrift = 0.014 * (this.groove / 100);
    const humanizeJitter = (Math.random() - 0.5) * 2 * maxDrift;

    let scheduleTime = now;
    if (timeInStep > 0.032 && timeUntilNext > 0.018) {
      scheduleTime = now + timeUntilNext + humanizeJitter;
    } else {
      scheduleTime = now + Math.max(0, humanizeJitter);
    }

    voice.triggerRhythmic(colorData, pitch, x, y, scheduleTime);
  }

  public static updateContinuousDrone(
    sensorId: number,
    colorData: ColorData,
    pitch: number,
    x?: number,
    y?: number
  ) {
    const voice = this.voicesStore.get(sensorId);
    if (voice) {
      voice.updateContinuous(colorData, pitch, x, y);
    }
  }

  public static updateSpatialPositions(coords: Array<{ id: number; x: number; y: number }>) {
    coords.forEach(({ id, x, y }) => {
      const voice = this.voicesStore.get(id);
      if (voice) {
        voice.updateSpatial(x, y);
      }
    });
  }

  public static stopDroneNode(sensorId: number) {
    const voice = this.voicesStore.get(sensorId);
    if (voice) {
      voice.stopContinuous();
    }
  }

  public static stopAllDrones() {
    for (const voice of this.voicesStore.values()) {
      voice.stopContinuous();
    }
    this.activeVoiceNotes.clear();
  }

  public static modulateGlobalDelay(globalMovementPct: number) {
    if (!this.delayNode) return;
    try {
      const wetLevel = 0.05 + (globalMovementPct / 100) * 0.45;
      const feedbackLevel = 0.12 + (globalMovementPct / 100) * 0.45;
      this.delayNode.wet.rampTo(wetLevel, 0.15);
      this.delayNode.feedback.rampTo(feedbackLevel, 0.15);
      if (this.masterWarmFilter) {
        const warmCutoff = 3200 + (globalMovementPct / 100) * 3200;
        this.masterWarmFilter.frequency.rampTo(warmCutoff, 0.2);
      }
    } catch (e) {}
  }

  public static getAudioStreamTrack(): MediaStreamTrack | null {
    if (!this.recordingDestNode) {
      this.setupRecordingDestination();
    }
    if (this.recordingDestNode && this.recordingDestNode.stream) {
      const tracks = this.recordingDestNode.stream.getAudioTracks();
      if (tracks.length > 0) {
        return tracks[0];
      }
    }
    return null;
  }

  public static startWavRecording(): boolean {
    try {
      const rawContext = Tone.getContext().rawContext as AudioContext;
      const rawDest = (Tone.Destination as any)._gainNode || (Tone.Destination as any).input;
      if (rawContext && rawDest) {
        this.wavRecorder.start(rawDest, rawContext);
        return true;
      }
    } catch (e) {
      console.error("Failed to start WAV recording:", e);
    }
    return false;
  }

  public static stopWavRecording(): Blob | null {
    return this.wavRecorder.stop();
  }
}
