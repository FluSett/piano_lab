self.onmessage = (event: MessageEvent<{ type: string; buffer: ArrayBuffer }>) => {
  const { type, buffer } = event.data;

  if (type === 'PARSE_AUDIO_BUFFER') {
    try {
      const bytes = new Uint8Array(buffer);
      const byteLength = bytes.byteLength;
      
      const sampleRateHint = 44100;
      const estimatedDuration = byteLength / (sampleRateHint * 2);


      self.postMessage({
        type: 'AUDIO_BUFFER_PARSED',
        payload: {
          byteLength,
          estimatedDuration,
          status: 'SUCCESS',
        },
      });
    } catch (err) {
      self.postMessage({
        type: 'AUDIO_BUFFER_ERROR',
        error: String(err),
      });
    }
  }
};

export {};
