/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class WavRecorder {
  private audioContext: AudioContext | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: AudioNode | null = null;
  private leftChannel: Float32Array[] = [];
  private rightChannel: Float32Array[] = [];
  private recordingLength = 0;
  private sampleRate = 44100;
  private isRecording = false;

  public start(source: AudioNode, context: AudioContext) {
    if (this.isRecording) return;

    this.audioContext = context;
    this.sampleRate = context.sampleRate || 44100;
    this.sourceNode = source;
    this.leftChannel = [];
    this.rightChannel = [];
    this.recordingLength = 0;

    // Buffer size 4096 gives balanced latency and reliability
    const bufferSize = 4096;
    this.processorNode = context.createScriptProcessor(bufferSize, 2, 2);

    this.processorNode.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const left = e.inputBuffer.getChannelData(0);
      const right = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : left;

      this.leftChannel.push(new Float32Array(left));
      this.rightChannel.push(new Float32Array(right));
      this.recordingLength += left.length;
    };

    source.connect(this.processorNode);
    this.processorNode.connect(context.destination);
    this.isRecording = true;
  }

  public stop(): Blob | null {
    if (!this.isRecording) return null;
    this.isRecording = false;

    if (this.processorNode && this.sourceNode) {
      try {
        this.sourceNode.disconnect(this.processorNode);
        this.processorNode.disconnect();
      } catch (e) {
        console.warn('WavRecorder disconnect error:', e);
      }
    }
    this.processorNode = null;

    if (this.recordingLength === 0) return null;

    // Merge channel buffers
    const mergedLeft = this.mergeBuffers(this.leftChannel, this.recordingLength);
    const mergedRight = this.mergeBuffers(this.rightChannel, this.recordingLength);

    // Interleave left and right channels
    const interleaved = this.interleave(mergedLeft, mergedRight);

    // Encode WAV PCM 16-bit
    const wavBlob = this.encodeWAV(interleaved, this.sampleRate);
    return wavBlob;
  }

  private mergeBuffers(channelBuffer: Float32Array[], totalLength: number): Float32Array {
    const result = new Float32Array(totalLength);
    let offset = 0;
    for (let i = 0; i < channelBuffer.length; i++) {
      result.set(channelBuffer[i], offset);
      offset += channelBuffer[i].length;
    }
    return result;
  }

  private interleave(left: Float32Array, right: Float32Array): Float32Array {
    const totalLength = left.length + right.length;
    const result = new Float32Array(totalLength);
    let inputIndex = 0;
    let outputIndex = 0;

    while (inputIndex < left.length) {
      result[outputIndex++] = left[inputIndex];
      result[outputIndex++] = right[inputIndex];
      inputIndex++;
    }
    return result;
  }

  private writeUTFBytes(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  private encodeWAV(samples: Float32Array, sampleRate: number): Blob {
    const numChannels = 2;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF identifier
    this.writeUTFBytes(view, 0, 'RIFF');
    // File length minus RIFF identifier and length field (36 + dataSize)
    view.setUint32(4, 36 + dataSize, true);
    // RIFF type
    this.writeUTFBytes(view, 8, 'WAVE');
    // format chunk identifier
    this.writeUTFBytes(view, 12, 'fmt ');
    // format chunk length (16 for PCM)
    view.setUint32(16, 16, true);
    // sample format (1 for PCM)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, numChannels, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sampleRate * blockAlign)
    view.setUint32(28, byteRate, true);
    // block align (numChannels * bytesPerSample)
    view.setUint16(32, blockAlign, true);
    // bits per sample
    view.setUint16(34, bitsPerSample, true);
    // data chunk identifier
    this.writeUTFBytes(view, 36, 'data');
    // data chunk length
    view.setUint32(40, dataSize, true);

    // Write 16-bit PCM samples
    let index = 44;
    for (let i = 0; i < samples.length; i++) {
      // Clamp between -1 and 1
      const s = Math.max(-1, Math.min(1, samples[i]));
      // Convert to 16-bit integer
      const val = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(index, val, true);
      index += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
  }
}
