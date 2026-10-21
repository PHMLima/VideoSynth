# Coesão Harmônica Avançada & Redesenho do Modo Contínuo (Drone)

Evolução do motor audiovisual para transformar a leitura bruta de pixels em uma paisagem sonora coesa, orgânica e confortável aos ouvidos, com **revisão profunda da função "Contínuo (Drone)"**, estabilização por inércia óptica, coordenação de acordes na escala e mixagem automática com *sidechain*.

---

## Decisões Confirmadas & Revisão Solicitada

> [!IMPORTANT]
> Diretrizes confirmadas pelo usuário acrescidas do redesenho específico para tornar o modo **Contínuo (Drone)** refinado e não-cansativo:

- **Confirmed Decision 1 (Estabilização Visual)**: **Inércia óptica suave com sustentação mínima** — filtragem de média móvel exponencial (EMA) nos valores HSL aliada a histerese e tempo mínimo de sustentação de nota (*note hold*), evitando saltos erráticos.
- **Confirmed Decision 2 (Coordenação entre Sensores)**: **Vozes complementares em acorde sempre na escala** — substituição da transposição cromática bruta por transposição diatônica em graus da escala, com distribuição inteligente de vozes (Tônica, 3ª, 5ª, 7ª) entre sensores ativos.
- **Confirmed Decision 3 (Refinamento Acústico & Mixagem)**: **Mixagem automática com filtro suave e sidechain** — ducking dinâmico onde o *Kick* abre espaço rítmico no *Bass* e *Lead*, compensação automática de ganho polifônico e filtragem analógica suave.
- **Confirmed Revision 4 (Redesenho do Modo "Contínuo / Drone")**: **Drones Aveludados com Respiração Orgânica e Repouso Dinâmico** — eliminação de frequências metálicas inarmônicas, adição de ciclo de respiração LFO lento, repouso inteligente quando a imagem está estática e transições de nota tipo *bloom* (em vez de glissandos de sirene contínuos).

---

## 1. Visão Geral & Diagnóstico do Modo "Contínuo (Drone)"

### Por que o modo Contínuo anterior soava cansativo?
1. **Sustentação Estática Ininterrupta**: Uma vez ativado (`brightness >= 6`), o sintetizador mantinha um som constante em volume máximo sem nunca respirar ou descansar, mesmo sobre áreas paradas do vídeo.
2. **Modulação FM Inarmônica e Onda Dente-de-Serra Aguda**: No *Lead*, a saturação alterava continuamente a `harmonicity` para valores fracionários (ex: `2.37`), gerando bandas laterais metálicas e dissonantes. No *Bass*, a onda `sawtooth` abria o filtro até quase `3000 Hz`, criando um zumbido contínuo na faixa de maior fadiga do ouvido humano (1kHz–3kHz).
3. **Efeito Sirene (Glissando Constante)**: Mudanças rápidas de cor faziam a frequência deslizar sem parar para cima e para baixo, soando artificial.

### Como o Novo "Contínuo (Drone)" Colabora de Modo Refinado:
- **Respiração Orgânica Assíncrona (Breathing LFO)**: Cada sensor contínuo possui um ciclo lento e independente de respiração ($0.12\text{ Hz}$ a $0.28\text{ Hz}$, como ondas do mar ou respiração humana) que modula suavemente o filtro e o volume, criando movimento vivo e relaxante.
- **Expressão Acoplada ao Movimento (Repouso Inteligente)**: Quando a região sob o sensor tem pouco movimento visual, o drone entra em um **estado de sussurro aveludado** (volume reduzido em `-8 dB` e filtro passa-baixas fechado nas frequências graves fundamentais). Quando luzes e movimentos cruzam o sensor, o som **desabrocha (*swell/bloom*)** suavemente e depois retorna à cama harmônica discreta.
- **Timbres Aveludados & Harmônicos Puros**:
  - *Lead Contínuo*: Usa apenas razões harmônicas puras e consonantes (`1:1`, `2:1`, `3:2`), índice FM reduzido e filtro passa-baixas dedicado ($< 1.8\text{ kHz}$) para soar como um *pad* analógico quente ou vidro cantado.
  - *Bass Contínuo*: Utiliza síntese sub-harmônica suave (onda triangular/senoidal filtrada abaixo de $450\text{ Hz}$), fornecendo uma fundação grave profunda e aconchegante sem zumbido médio-agudo.
  - *Kick / Hi-Hat em Modo Contínuo*: Se configurados como contínuos, operam como texturas ambientais sutis (pulsação sub-grave suave ou brisa filtrada de baixo ganho) em vez de ruído metálico constante.
- **Transição *Dip-and-Bloom* entre Notas**: Ao mudar de grau na escala após o tempo mínimo de sustentação, o drone fecha sutilmente o filtro e o envelope durante a troca de nota e reabre suavemente na nova nota — como a troca de arco de um violoncelo.

---

## 2. Experiência do Usuário & Design Visual

### A. Fluxos Interativos e Controles
- **Controle de Inércia & Suavidade (Master Bar)**: Ajuste deslizante de **Inércia & Respiração (0% a 100%)** na barra superior, controlando o tempo de sustentação das notas e a suavidade das transições dos drones.
- **Indicador de Acorde Coletivo Ao Vivo**: Exibição em tempo real das notas que compõem o campo harmônico ativo no momento (ex: `Campo Harmônico: Dó2 · Sol3 · Mi4`).
- **Rótulo de Nota Musical no Canvas**: Cada sensor exibe sobre o vídeo a **nota musical exata** em execução (ex: `Sol4`, `Dó2`), além de uma pulsação visual lenta que reflete a respiração orgânica dos sensores em modo Contínuo.
- **Transposição Diatônica por Graus**: O controle de afinação do sensor opera em graus da escala e oitavas, garantindo que ajustes manuais, *presets* ou o botão "Aleatório" nunca tirem os sensores de tom.

### B. Identidade Visual & Hierarquia
- **Aesthetic Direction**: Interface de instrumento de estúdio modular escuro (*Dark Studio Sandbox*), mantendo 60% da área dedicada ao palco visual e agrupando os controles com precisão tipográfica.
- **Color Palette & Mood**: Superfícies neutras (`bg-stone-950`, `bg-stone-900`), bordas estruturais discretas (`border-stone-800`) e acentos semânticos em violeta (`text-purple-400`) e ciano para conexões harmônicas.
- **Typography & Hierarchy**: `Space Grotesk` para cabeçalhos, `Inter` para controles e `JetBrains Mono` (`tabular-nums`) para notas musicais, BPM e coordenadas.

---

## 3. Decisões de Produto & Trade-Offs

- **Decisão 1: Timbre Dedicado por Modo (Rítmico vs. Contínuo)**
  - *Abordagem Escolhida*: Adaptar o envelope, a forma de onda e o filtro do `VoiceController` quando o sensor está em modo `continuous` (ataque longo de $0.4\text{s}$, filtro passa-baixas de $24\text{ dB/oct}$, razões FM inteiras e teto de ganho reduzido em `-5 dB` em relação aos transientes rítmicos).
  - *Por quê*: Um timbre percussivo com ataque rápido e harmônicos brilhantes funciona bem em notas curtas de $120\text{ms}$, mas torna-se cansativo quando sustentado continuamente. Separar o perfil tímbrico do modo contínuo garante que os *drones* atuem como um tapete sonoro acolhedor.

- **Decisão 2: Dinâmica de "Repouso & Desabrochar" (Motion-Coupled Swell)**
  - *Abordagem Escolhida*: Combinar a luminosidade ($L$) com a variação óptica suavizada ($\Delta\text{movimento}$) e um LFO lento individual para modular o volume e a abertura do filtro do drone.
  - *Por quê*: Evita a fadiga de um som estático infinito; o drone "respira" junto com a atividade visual da cena.

- **Decisão 3: Orquestrador de Vozes Complementares & Mixagem com Sidechain**
  - *Abordagem Escolhida*: Coordenar os sensores ativos para ocuparem graus distintos da escala (1º, 3º, 5º, 7º) e aplicar *sidechain ducking* suave (`-4.5 dB` por $160\text{ms}$) sobre o barramento de drones/baixo sempre que o *Kick* dispara.
  - *Por quê*: Integra ritmicamente os sensores contínuos aos sensores rítmicos, fazendo toda a paisagem sonora pulsar de forma coesa e orgânica.

---

## 4. Arquitetura Técnica & Estratégia de Dados

### Diagrama de Arquitetura e Fluxo de Sinal

```
┌────────────────────────────────────────────────────────────────────────────┐
│                   LEITURA ÓPTICA DO CANVAS (60 FPS)                        │
│        Amostragem de Pixels (Raio 32px) ──> Conversão RGB / HSL            │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│               ESTABILIZADOR & INÉRCIA ÓPTICA (POR SENSOR)                  │
│  • Filtro EMA (Inércia Suave): Suaviza Matiz, Saturação, Luz e Movimento   │
│  • Histerese & Sustentação Mínima: Evita trocas de nota antes de 450ms     │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                  COORDENADOR DE ACORDES (HARMONIC ENGINE)                  │
│  • Transposição Diatônica: Converte offset do sensor em graus da escala    │
│  • Distribuição de Vozes: Evita uníssonos/choques, priorizando 1ª, 3ª, 5ª  │
└─────────────────┬───────────────────────────────────────┬──────────────────┘
                  │                                       │
                  ▼                                       ▼
┌───────────────────────────────────┐   ┌────────────────────────────────────┐
│     MODO RÍTMICO (TRANSIENTES)    │   │     MODO CONTÍNUO (VELVET DRONE)   │
│  • Quantização BPM + Groove       │   │  • Timbre Aveludado (Harm. Puros)  │
│  • Ataque Percussivo Definido     │   │  • LFO de Respiração + Swell Óptico│
│  • Dispara Pulso de Sidechain ────┼──>│  • Transição Dip-and-Bloom Suave   │
└─────────────────┬─────────────────┘   └─────────────────┬──────────────────┘
                  │                                       │
                  ▼                                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    BARRAMENTO DE MIXAGEM AUTOMÁTICA                        │
│  • Sidechain Ducking Bus + Auto-Gain Polyphonic Scaling                    │
│  • Tone.Chorus Espacial Sutil + Tone.Filter Analógico Passa-Baixas         │
│  • Tone.FeedbackDelay ──> Tone.Reverb ──> Tone.Limiter ──> Saída / WAV     │
└────────────────────────────────────────────────────────────────────────────┘
```

### Mapeamento de Estado e Componentes Interativos

- **Motor de Drone Aveludado (`VoiceController` em `src/audio.ts`)**:
  - Cada voz possui um `voiceFilter: Tone.Filter` passa-baixas suave, `volumeNode` e `pannerNode`, além de fase própria de respiração (`breathPhase`).
  - No modo `continuous`, a voz calcula o nível de repouso/desabrochar combinando luminosidade suavizada, movimento suavizado e o ciclo lento de respiração, aplicando transições *dip-and-bloom* quando o grau da escala muda.
- **Coordenador Harmônico & Barramento Mestre (`AudioEngine`)**:
  - Mantém o registro `activeSensorNotes: Map<number, string>` para distribuir sensores em acordes consonantes e informar a UI em tempo real.
  - Aplica atenuação polifônica automática e *sidechain ducking* no barramento melódico quando sensores de *Kick* disparam.
- **Controles de Coesão e Telemetria Musical (`src/App.tsx`)**:
  - Controle de **Inércia & Suavidade** na barra mestre.
  - Exibição do **Campo Harmônico Ativo** (notas do acorde atual) e rótulo da nota em cada sensor no canvas.
