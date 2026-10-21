/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SensorData } from './types';

export interface Preset {
  name: string;
  description: string;
  sensors: Partial<SensorData>[];
}

export const PRESETS: Record<string, Preset> = {
  'beat_making': {
    name: 'Caso 1: Criação de Batida (Beat Making)',
    description: 'Batida rítmica e caótica com bumbos pulando nas bordas e chimbais orbitando em círculos.',
    sensors: [
      {
        id: 1,
        x: 200,
        y: 225,
        baseX: 200,
        baseY: 225,
        instrument: 'kick',
        mode: 'rhythmic',
        volume: -3,
        pitch: 0,
        timbre: 40,
        autonomousMode: 'dvd',
        velX: 3,
        velY: 2,
        phase: 0,
        isActive: false
      },
      {
        id: 2,
        x: 600,
        y: 225,
        baseX: 600,
        baseY: 225,
        instrument: 'kick',
        mode: 'rhythmic',
        volume: -3,
        pitch: 3,
        timbre: 40,
        autonomousMode: 'dvd',
        velX: -3,
        velY: -2,
        phase: Math.PI,
        isActive: false
      },
      {
        id: 3,
        x: 300,
        y: 150,
        baseX: 300,
        baseY: 150,
        instrument: 'hihat',
        mode: 'rhythmic',
        volume: -10,
        pitch: 0,
        timbre: 70,
        autonomousMode: 'circular',
        velX: 3,
        velY: 2,
        phase: 0,
        isActive: false
      },
      {
        id: 4,
        x: 500,
        y: 300,
        baseX: 500,
        baseY: 300,
        instrument: 'hihat',
        mode: 'rhythmic',
        volume: -10,
        pitch: 7,
        timbre: 70,
        autonomousMode: 'circular',
        velX: 3,
        velY: 2,
        phase: Math.PI,
        isActive: false
      }
    ]
  },
  'ambient_pad': {
    name: 'Caso 2: Pad Atmosférico (Ambient)',
    description: 'Textura suave com sintetizadores sutilmente orbitando e o contra-baixo dinamicamente perseguindo luzes.',
    sensors: [
      {
        id: 1,
        x: 250,
        y: 150,
        baseX: 250,
        baseY: 150,
        instrument: 'lead',
        mode: 'continuous',
        volume: -8,
        pitch: 0,
        timbre: 80,
        autonomousMode: 'circular',
        velX: 3,
        velY: 2,
        phase: 0,
        isActive: false
      },
      {
        id: 2,
        x: 550,
        y: 300,
        baseX: 550,
        baseY: 300,
        instrument: 'lead',
        mode: 'continuous',
        volume: -8,
        pitch: 7,
        timbre: 60,
        autonomousMode: 'circular',
        velX: 3,
        velY: 2,
        phase: Math.PI,
        isActive: false
      },
      {
        id: 3,
        x: 300,
        y: 225,
        baseX: 300,
        baseY: 225,
        instrument: 'bass',
        mode: 'continuous',
        volume: -5,
        pitch: -12,
        timbre: 50,
        autonomousMode: 'tracking',
        velX: 3,
        velY: 2,
        phase: 0,
        isActive: false
      },
      {
        id: 4,
        x: 500,
        y: 225,
        baseX: 500,
        baseY: 225,
        instrument: 'bass',
        mode: 'continuous',
        volume: -5,
        pitch: -5,
        timbre: 70,
        autonomousMode: 'tracking',
        velX: 3,
        velY: 2,
        phase: 0,
        isActive: false
      }
    ]
  },
  'live_performance': {
    name: 'Caso 3: Performance ao Vivo',
    description: 'Controle direto sobre 4 sintetizadores manuais, apoiados por 4 geradores de ritmo autônomos em background.',
    sensors: [
      // Manuals
      { id: 1, x: 150, y: 120, baseX: 150, baseY: 120, instrument: 'kick', mode: 'rhythmic', volume: -6, pitch: 0, timbre: 50, autonomousMode: 'none' },
      { id: 2, x: 150, y: 320, baseX: 150, baseY: 320, instrument: 'hihat', mode: 'rhythmic', volume: -12, pitch: 0, timbre: 50, autonomousMode: 'none' },
      { id: 3, x: 300, y: 225, baseX: 300, baseY: 225, instrument: 'bass', mode: 'continuous', volume: -6, pitch: -12, timbre: 40, autonomousMode: 'none' },
      { id: 4, x: 450, y: 225, baseX: 450, baseY: 225, instrument: 'lead', mode: 'continuous', volume: -6, pitch: 0, timbre: 60, autonomousMode: 'none' },
      // Autonomous background
      { id: 5, x: 600, y: 150, baseX: 600, baseY: 150, instrument: 'kick', mode: 'rhythmic', volume: -6, pitch: 3, timbre: 40, autonomousMode: 'dvd', velX: 3, velY: 1 },
      { id: 6, x: 700, y: 300, baseX: 700, baseY: 300, instrument: 'hihat', mode: 'rhythmic', volume: -14, pitch: 7, timbre: 70, autonomousMode: 'circular', velX: 2, velY: 2 },
      { id: 7, x: 650, y: 225, baseX: 650, baseY: 225, instrument: 'lead', mode: 'continuous', volume: -8, pitch: 12, timbre: 60, autonomousMode: 'circular', velX: 2, velY: 2 },
      { id: 8, x: 200, y: 200, baseX: 200, baseY: 200, instrument: 'bass', mode: 'continuous', volume: -8, pitch: -24, timbre: 30, autonomousMode: 'tracking' }
    ]
  },
  'experimentation': {
    name: 'Caso 4: Exploração Experimental',
    description: 'Parâmetros totalmente aleatórios, posições caóticas e interações ruidosas em loop generativo.',
    sensors: [
      { id: 1, x: 120, y: 110, baseX: 120, baseY: 110, instrument: 'bass', mode: 'continuous', volume: -6, pitch: -5, timbre: 80, autonomousMode: 'tracking' },
      { id: 2, x: 350, y: 310, baseX: 350, baseY: 310, instrument: 'lead', mode: 'continuous', volume: -8, pitch: 17, timbre: 95, autonomousMode: 'circular', phase: 1.2 },
      { id: 3, x: 650, y: 150, baseX: 650, baseY: 150, instrument: 'hihat', mode: 'rhythmic', volume: -15, pitch: -10, timbre: 85, autonomousMode: 'dvd', velX: 4, velY: 3 },
      { id: 4, x: 500, y: 350, baseX: 500, baseY: 350, instrument: 'kick', mode: 'rhythmic', volume: -2, pitch: -3, timbre: 90, autonomousMode: 'dvd', velX: -3, velY: 4 }
    ]
  },
  'music_video': {
    name: 'Caso 5: Sincronização com Clipes',
    description: 'Sincronização estratégica onde o bumbo e chimbal seguem batidas visuais e o baixo segura os graves.',
    sensors: [
      {
        id: 1,
        x: 400,
        y: 225,
        baseX: 400,
        baseY: 225,
        instrument: 'kick',
        mode: 'rhythmic',
        volume: -4,
        pitch: 0,
        timbre: 50,
        autonomousMode: 'none',
        isActive: false
      },
      {
        id: 2,
        x: 250,
        y: 150,
        baseX: 250,
        baseY: 150,
        instrument: 'hihat',
        mode: 'rhythmic',
        volume: -10,
        pitch: 0,
        timbre: 60,
        autonomousMode: 'none',
        isActive: false
      },
      {
        id: 3,
        x: 400,
        y: 350,
        baseX: 400,
        baseY: 350,
        instrument: 'bass',
        mode: 'continuous',
        volume: -5,
        pitch: -12,
        timbre: 50,
        autonomousMode: 'none',
        isActive: false
      }
    ]
  }
};

export const INITIAL_SENSORS: SensorData[] = [
  {
    id: 1,
    x: 150,
    y: 150,
    baseX: 150,
    baseY: 150,
    instrument: 'kick',
    mode: 'rhythmic',
    volume: -6,
    pitch: 0,
    timbre: 50,
    autonomousMode: 'dvd',
    color: '#3b82f6',
    avgColor: { r: 59, g: 130, b: 246, brightness: 120 },
    movement: 0,
    velX: 3,
    velY: 2,
    phase: 0,
    isActive: false,
    lastTriggered: 0
  },
  {
    id: 2,
    x: 650,
    y: 150,
    baseX: 650,
    baseY: 150,
    instrument: 'hihat',
    mode: 'rhythmic',
    volume: -12,
    pitch: 0,
    timbre: 50,
    autonomousMode: 'circular',
    color: '#10b981',
    avgColor: { r: 16, g: 185, b: 129, brightness: 110 },
    movement: 0,
    velX: 3,
    velY: 2,
    phase: Math.PI / 4,
    isActive: false,
    lastTriggered: 0
  },
  {
    id: 3,
    x: 250,
    y: 300,
    baseX: 250,
    baseY: 300,
    instrument: 'bass',
    mode: 'continuous',
    volume: -6,
    pitch: -12,
    timbre: 50,
    autonomousMode: 'none',
    color: '#8b5cf6',
    avgColor: { r: 139, g: 92, b: 246, brightness: 130 },
    movement: 0,
    velX: 3,
    velY: 2,
    phase: 0,
    isActive: false,
    lastTriggered: 0
  },
  {
    id: 4,
    x: 550,
    y: 300,
    baseX: 550,
    baseY: 300,
    instrument: 'lead',
    mode: 'continuous',
    volume: -6,
    pitch: 0,
    timbre: 50,
    autonomousMode: 'tracking',
    color: '#ec4899',
    avgColor: { r: 236, g: 72, b: 153, brightness: 140 },
    movement: 0,
    velX: 3,
    velY: 2,
    phase: 0,
    isActive: false,
    lastTriggered: 0
  }
];
