// Magenta's browser adapter assumes window; inference also runs in a dedicated worker.
export const fetch = globalThis.fetch.bind(globalThis);
export const performance = globalThis.performance;
export const navigator = globalThis.navigator;
export const isSafari = false;
export const getOfflineAudioContext: (sampleRate: number) => OfflineAudioContext = () => { throw new Error('Audio contexts are created on the main thread, not in the MusicVAE worker.'); };
