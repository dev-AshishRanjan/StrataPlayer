
export class AudioEngine {
  private context: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private video: HTMLVideoElement;
  private isInitialized = false;

  constructor(video: HTMLVideoElement) {
    this.video = video;
  }

  /**
   * Initialize the AudioContext. Must be called after user interaction.
   */
  init() {
    if (this.isInitialized) return;
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    this.context = new AudioContext();
    this.gainNode = this.context.createGain();
    
    // Connect video -> gain -> destination
    try {
        this.source = this.context.createMediaElementSource(this.video);
        this.source.connect(this.gainNode);
        this.gainNode.connect(this.context.destination);
        this.isInitialized = true;
    } catch (e) {
        console.warn("StrataPlayer: Failed to initialize AudioEngine", e);
    }
  }

  setGain(value: number) {
    // Lazy init on first boost attempt
    if (!this.isInitialized) this.init();
    
    if (this.gainNode && this.context) {
      this.gainNode.gain.value = value;
      
      // Web Audio context might be suspended by browser policy
      if (this.context.state === 'suspended') {
        this.context.resume();
      }
    }
  }

  destroy() {
     if (this.context) {
         this.context.close();
     }
     this.isInitialized = false;
  }
}
