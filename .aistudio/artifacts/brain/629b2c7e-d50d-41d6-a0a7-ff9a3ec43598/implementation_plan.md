# Plano de Verificação e Aprimoramento: Sintetizador Audiovisual Modular

Auditoria completa e correção estrutural de todas as funcionalidades do sintetizador audiovisual, garantindo estabilidade máxima de áudio no Tone.js, taxa sólida de 60 FPS no visualizador, suporte a webcam ao vivo em tempo real, exportação tanto em vídeo WebM quanto em áudio WAV, e verificação minuciosa do funcionamento pleno de cada sensor e seus parâmetros.

## Revisão do Usuário & Decisões Críticas

> [!IMPORTANT]
> **Decisões e Prioridades Confirmadas:**
> 1. **Foco Principal**: Estabilidade de áudio cristalino, garantia de 60 FPS sem travamentos e integração de webcam ao vivo.
> 2. **Vídeo ao Vivo**: Suporte a webcam (`navigator.mediaDevices.getUserMedia`) com comutação instantânea e liberação limpa de streams.
> 3. **Exportação de Sessão**: Suporte duplo a gravação de Vídeo WebM (vídeo do canvas sincronizado com áudio do Tone.js) e exportação de Áudio Puro em formato WAV estéreo sem perda.
> 4. **Verificação Plena dos Sensores**: Auditoria rigorosa de todos os 4 instrumentos, 2 modos sonoros, 4 modos de movimento, arpegiador, telemetria cromática e gerenciamento de vozes de cada sensor.

---

## 1. Visão Geral e Conceito Central

- **O que faz**: Transforma qualquer fluxo de vídeo (gerador generativo dinâmico, clipes demonstrativos, upload de arquivo local ou câmera webcam ao vivo) em áudio generativo interativo através de sensores circulares configuráveis (bumbos, chimbais, contrabaixos e leads melódicos), com modos de movimento manual, órbita circular, ricochete DVD e perseguição inteligente por luminosidade (*motion tracking*).
- **Público-Alvo**: Músicos eletrônicos, artistas audiovisuais, criadores de conteúdo e performers digitais.
- **Valor Principal**: Experiência performática em tempo real onde a imagem literalmente "toca" o sintetizador, sem engasgos de frames, sem estalos no áudio e com precisão tátil em cada sensor.

---

## 2. Auditoria e Verificação Plena dos Sensores

Cada sensor na tela atua como um captador óptico de áudio com síntese dedicada no Tone.js. A implementação verificará e assegurará o funcionamento pleno de cada faceta:

### A. Tipos de Instrumentos de Síntese
1. **KICK (Bumbo / Percussão Grave)**:
   - Motor: `Tone.MembraneSynth`.
   - Modulação por Cor: Tom base definido pelo canal Vermelho (R) na escala selecionada, com afinação profunda.
   - Modulação por Timbre: Duração do decaimento (*decay*) de 0.01s a 0.30s conforme o slider de Timbre.
   - Verificação: Resposta rápida e soco percussivo limpo sem cortes abruptos.

2. **HI-HAT (Chimbal Metálico)**:
   - Motor: `Tone.MetalSynth`.
   - Modulação por Cor: Frequência de ressonância modulada diretamente pelo canal Vermelho (3000 Hz a 9000 Hz).
   - Modulação por Timbre: Variação harmônica (`harmonicity` de 1 a 10) e índice de modulação (`modulationIndex` de 10 a 100).
   - Verificação: Sons metálicos abertos/fechados nítidos, com resposta veloz de transientes.

3. **BASS (Contrabaixo Sintetizado)**:
   - Motor: `Tone.MonoSynth` (onda quadrada rica em harmônicos).
   - Modulação por Cor: Tom selecionado via canal Vermelho (R) nas oitavas graves (2 e 3); frequência de corte do filtro passa-baixas modulada dinamicamente pelo canal Azul (B) de 100 Hz a 2000 Hz.
   - Modulação por Timbre: Fator de ressonância Q do filtro (0 a 10) e envelope de oitavas do filtro.
   - Verificação: Graves cheios, sem saturação indesejada no canal master.

4. **LEAD (Melodia & Textura FM)**:
   - Motor: `Tone.FMSynth` (onda senoidal portadora + moduladora triangular).
   - Modulação por Cor: Altura tonal via canal Vermelho (R) nas oitavas 4 e 5; índice de harmonicidade modulado dinamicamente pelo canal Verde (G) de 1.0 a 4.5.
   - Modulação por Timbre: Profundidade de modulação FM (1 a 50) para sons que variam de etéreos a cortantes.
   - Verificação: Expressividade tonal contínua e micro-afinação suave por variação cromática.

### B. Modos de Reprodução do Som
1. **Modo Rítmico (Batida)**:
   - Disparo por pulso de movimento local e brilho mínimo relativo à sensibilidade configurada.
   - *Debounce* inteligente de 100ms para evitar re-disparos erráticos.
   - Duração da nota de 125ms com anel de luz pulsante sincronizado na tela.
2. **Modo Contínuo (Drone / Pad)**:
   - O oscilador sustenta o som enquanto o sensor estiver sobre áreas com brilho perceptível (> 5).
   - Volume ajustado suavemente pela luminosidade média com rampa linear (`rampTo`).
   - Micro-desafinação harmônica (-50 a +50 cents) baseada na saturação vermelha para criar movimento acústico orgânico.
   - Liberação (*release*) suave de 0.5s ao silenciar ou pausar.

### C. Modos de Movimento Autônomo e Físico
1. **Manual (`none`)**: Arraste fluído e responsivo com clique do mouse ou toque na tela, com limites de proteção contra escape das bordas (margem de 32px).
2. **Órbita Circular (`circular`)**: Rotação suave em raio de 150px em torno do ponto de ancoragem base (`baseX`, `baseY`), com avanço uniforme de fase angular de 0.02 rad/frame sem saltos.
3. **DVD Bounce (`dvd`)**: Movimento diagonal com vetor de velocidade ($velX, velY$) e reflexão física perfeita nas 4 extremidades do quadro (800x450).
4. **Motion Tracking (`tracking`)**: Amostragem de luminosidade em raio estendido de 64px buscando o ponto de maior claridade e aproximação suave (interpolação de 5% por frame) perseguindo luzes, focos de neon ou mãos na câmera.

### D. Módulo de Arpegiador Integrado
- Disponível tanto no modo Rítmico quanto Contínuo.
- 3 Padrões selecionáveis: **Subir (Up)**, **Descer (Down)** e **Aleatório (Random)** percorrendo as notas da escala ativa.
- Velocidade de passo configurável de 60ms (ultra-rápido) a 800ms (lento e contemplativo).
- Verificação: Sequenciamento sem atrasos, mantendo sincronismo com a harmonia global.

### E. Gerenciamento de Sensores
- Adição dinâmica de novos sensores (até o limite de 16) com posicionamento central inteligente.
- Remoção individual ou em lote, com descarte apropriado de nós no Tone.js para evitar vazamento de memória e vozes órfãs.
- Controles de sensibilidade individual e botão rápido de "Aplicar a todos".
- Opacidade global regulável de 0% a 100% para manter visualização do vídeo limpa quando desejado.

---

## 3. Diagnóstico Técnico de Falhas Globais e Correções

### A. Desacoplamento do Loop de Análise (Garantia de 60 FPS)
- **Causa Raiz**: O loop `requestAnimationFrame` chamava `setSensors(updatedSensors)` a cada frame, gerando 60 re-renderizações completas do React por segundo, reinvocando `useEffect([sensors])` e chamando `AudioEngine.syncSensors()` continuamente.
- **Correção**:
  - Manter toda a física, amostragem de pixels e renderização no Canvas isolados em `sensorsRef`.
  - Desacoplar atualizações do painel React: acionar `setSensors` apenas em interações diretas do usuário (sliders, cliques, drag-and-drop, presets).
  - Telemetria de tela (valores numéricos e cores do sensor selecionado) atualizada por amostragem suave em taxa controlada (~100ms) sem forçar rebuild do DOM global.

### B. Suporte a Webcam ao Vivo em Tempo Real
- Adicionar opção "Câmera ao Vivo (Webcam)" no menu de seleção de vídeo.
- Inicialização de stream com `navigator.mediaDevices.getUserMedia({ video: { width: 800, height: 450 }, audio: false })`.
- Tratamento de permissões com fallback amigável caso a câmera não esteja disponível.
- Liberação segura de recursos (`track.stop()`) ao alternar de fonte.

### C. Gravação e Exportação Dupla (WebM e WAV Puro)
- **Vídeo WebM**: Captura do canvas a 30/60 FPS mixada com o canal de áudio principal via `MediaStreamAudioDestinationNode`.
- **Áudio WAV Puro**: Captura estéreo PCM sem compressão direta do nó `Tone.Destination`, gerando arquivo `.wav` de estúdio para download.
- Ambos acionados por interface limpa e intuitiva com indicação de tempo de gravação ativo.

---

## 4. Arquitetura do Sistema

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FONTES DE VÍDEO & IMAGEM                        │
│  [Gerador Procedural] | [Webcam ao Vivo] | [Upload MP4/WebM] | [Demos] │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   MOTOR DE PROCESSAMENTO DE IMAGEM                     │
│  - Offscreen Canvas Rasterizer (800x450)                               │
│  - Amostragem Radial de Cores (RGB + Brilho médio)                     │
│  - Módulos de Movimento: Manual / Órbita / DVD Bounce / Motion Tracker │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌───────────────────────────────────┐  ┌─────────────────────────────────┐
│     CANVAS DE EXIBIÇÃO (60 FPS)   │  │       MOTOR DE ÁUDIO TONE.JS    │
│  - Trilha visual dos sensores     │  │  - Kick (MembraneSynth)         │
│  - Feedback tátil de batida/pulso │  │  - Hi-Hat (MetalSynth)          │
│  - Linhas de modulação modular    │  │  - Bass (Mono lowpass synth)    │
│  - Zero overhead de re-render     │  │  - Lead (FMSynth expressivo)    │
└───────────────────────────────────┘  │  - Arpeggiator (Up/Down/Random) │
                                       │  - Global Delay & Reverb Room   │
                                       └────────────────┬────────────────┘
                                                        │
                                                        ▼
                                       ┌─────────────────────────────────┐
                                       │    SISTEMA DE GRAVAÇÃO/EXPORT   │
                                       │  - Vídeo WebM (Canvas + Áudio)  │
                                       │  - Áudio WAV Estéreo Direto     │
                                       └─────────────────────────────────┘
```

---

## 5. Plano de Implementação Passo a Passo

1. **Refatoração do Motor de Áudio (`src/audio.ts`)**:
   - Assegurar inicialização limpa de nós de gravação (`MediaStreamAudioDestinationNode` e gravador WAV PCM).
   - Ajustar curvas de rampa (`rampTo`) para eliminar cliques e ruídos na modulação contínua e no arpegiador.
   - Reforçar o descarte (`dispose`) de vozes de sensores removidos.

2. **Refatoração do Loop Visual e Sensores em `src/App.tsx`**:
   - Isolar o ciclo de 60 FPS dentro do Canvas via referências mutáveis (`sensorsRef`, `animationFrameRef`).
   - Integrar suporte completo a Webcam ao vivo (`getUserMedia`) com limpeza de stream.
   - Implementar gravação dupla: botão de Vídeo WebM e botão de Áudio WAV.
   - Implementar verificação e telemetria precisa para cada um dos 4 instrumentos e modos autônomos.

3. **Verificação, Presets e Compilação**:
   - Testar os 5 presets de fábrica (`beat_making`, `ambient_pad`, `live_performance`, `experimentation`, `music_video`).
   - Testar o editor customizável de notas e escalas musicais.
   - Testar responsividade tátil e arraste com mouse e toque móvel.
   - Executar `compile_applet` para validação de integridade.
