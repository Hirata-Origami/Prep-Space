class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 1600;
    this.buffer = new Int16Array(this.bufferSize);
    this.offset = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      const float32 = input[0];

      for (let i = 0; i < float32.length; i++) {
        const sample = Math.max(-1, Math.min(1, float32[i]));
        this.buffer[this.offset++] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;

        if (this.offset >= this.bufferSize) {
          const data = this.buffer.buffer.slice(0);
          this.port.postMessage(data, [data]);
          this.offset = 0;
        }
      }
    }
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
