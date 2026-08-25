// AudioEngine.ts - Synthesized & Original Video Ambient Sound Engine for XignuX Print Den
class AudioEngine {
    private ctx: AudioContext | null = null;
    private isMuted: boolean = false;
    private ambientAudio: HTMLAudioElement | null = null;
    private isAmbientPlaying: boolean = false;

    private initCtx() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    public toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        if (this.ambientAudio) {
            this.ambientAudio.muted = this.isMuted;
        }
        return this.isMuted;
    }

    public getMuted(): boolean {
        return this.isMuted;
    }

    // Start background authentic video ambient sound (/xignux_ambient.mp3)
    public startAmbient() {
        if (this.isAmbientPlaying) return;
        this.initCtx();

        try {
            if (!this.ambientAudio) {
                this.ambientAudio = new Audio(`${import.meta.env.BASE_URL}xignux_ambient.mp3`);
                this.ambientAudio.loop = true;
                this.ambientAudio.volume = 0.35;
            }
            this.ambientAudio.muted = this.isMuted;
            this.ambientAudio.play().then(() => {
                this.isAmbientPlaying = true;
            }).catch(e => {
                console.warn('Ambient audio play prevented:', e);
            });
        } catch (e) {
            console.warn('Audio start error:', e);
        }
    }

    // Stop / Pause background ambient audio when leaving the workshop
    public stopAmbient() {
        if (this.ambientAudio) {
            this.ambientAudio.pause();
            this.ambientAudio.currentTime = 0;
            this.isAmbientPlaying = false;
        }
    }

    // Sound effect: Printer printing sweep (bzzzt... chhh...)

    public playPrintSweep() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.15);

            gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.15);
        } catch (e) { }
    }

    // Sound effect: Cutting / Trimming scissors (snip!)
    public playScissorsCut() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        try {
            const bufferSize = this.ctx.sampleRate * 0.08;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 3000;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start();
        } catch (e) { }
    }

    // Sound effect: Order bounced / rejected warning (BEEP BEEP!)
    public playBounceWarning() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(880, now + 0.1);
            osc.frequency.setValueAtTime(440, now + 0.2);

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.35);
        } catch (e) { }
    }

    // Sound effect: Order Complete / Money chime (Ding-ding-shing!)
    public playOrderComplete() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const notes = [523.25, 659.25, 783.99, 1046.50];

            notes.forEach((freq, idx) => {
                if (!this.ctx) return;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);

                gain.gain.setValueAtTime(0.1, now + idx * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.3);
            });
        } catch (e) { }
    }

    // Sound effect: Click UI button
    public playClick() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.04);

            gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.04);
        } catch (e) { }
    }
}

export const audioEngine = new AudioEngine();
