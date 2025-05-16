/**
 * SpeechToText component for voice input
 * Based on the original from aider/gui_speech_to_text.js
 */
import { LitElement, html, css } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import '@material/web/button/filled-tonal-button.js';
import '@material/web/switch/switch.js';
import '@material/web/icon/icon.js';

export class SpeechToText extends LitElement {
  static properties = {
    isListening: { type: Boolean, state: true },
    autoTranscribe: { type: Boolean, state: true },
    isSupported: { type: Boolean, state: true },
    ledStatus: { type: String, state: true } // 'inactive', 'listening', 'speaking'
  };

  constructor() {
    super();
    this.isListening = false;
    this.autoTranscribe = false;
    this.isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    this.ledStatus = 'inactive';
    this.recognition = null;
    this._initSpeechRecognition();
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      padding: 8px;
      border-radius: 8px;
      background-color: var(--md-sys-color-surface-variant, #e7e0ec);
      margin: 8px 0;
    }

    .led {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 10px;
      transition: background-color 0.3s ease;
    }
    
    .led-inactive {
      background-color: #757575;
      box-shadow: 0 0 5px rgba(117, 117, 117, 0.5);
    }
    
    .led-listening {
      background-color: #ff9800;
      box-shadow: 0 0 5px rgba(255, 152, 0, 0.5);
    }
    
    .led-speaking {
      background-color: #4caf50;
      box-shadow: 0 0 8px rgba(76, 175, 80, 0.7);
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .auto-transcribe {
      display: flex;
      align-items: center;
      margin-left: auto;
      gap: 8px;
    }

    .label {
      font-size: 14px;
      white-space: nowrap;
    }
    
    .unsupported {
      color: #d32f2f;
      font-style: italic;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    // Re-initialize recognition when component is connected
    if (!this.recognition && this.isSupported) {
      this._initSpeechRecognition();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Stop recognition and clean up when component is disconnected
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
    }
  }

  _initSpeechRecognition() {
    if (!this.isSupported) return;

    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // Configure recognition
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = navigator.language || 'en-US';
    
    // Set up event handlers
    this.recognition.onstart = this._handleStart.bind(this);
    this.recognition.onresult = this._handleResult.bind(this);
    this.recognition.onerror = this._handleError.bind(this);
    this.recognition.onend = this._handleEnd.bind(this);
    this.recognition.onspeechstart = this._handleSpeechStart.bind(this);
    this.recognition.onspeechend = this._handleSpeechEnd.bind(this);
  }

  _handleStart() {
    this.isListening = true;
    this.ledStatus = 'listening';
    this.dispatchEvent(new CustomEvent('recording-started', {
      bubbles: true,
      composed: true
    }));
  }

  _handleSpeechStart() {
    this.ledStatus = 'speaking';
  }

  _handleSpeechEnd() {
    if (this.autoTranscribe && this.isListening) {
      this.ledStatus = 'listening';
    }
  }

  _handleResult(event) {
    if (event.results.length > 0) {
      const transcript = event.results[event.resultIndex][0].transcript;
      
      // Dispatch event with transcript
      this.dispatchEvent(new CustomEvent('transcript', {
        detail: { text: transcript },
        bubbles: true,
        composed: true
      }));
      
      // If not auto-transcribing, stop listening
      if (!this.autoTranscribe) {
        this.stopListening();
      }
    }
  }

  _handleError(event) {
    console.error('Speech recognition error:', event.error);
    this.stopListening();
    
    this.dispatchEvent(new CustomEvent('recognition-error', {
      detail: { error: event.error },
      bubbles: true,
      composed: true
    }));
  }

  _handleEnd() {
    // If auto-transcribe is enabled and we were listening, restart
    if (this.autoTranscribe && this.isListening) {
      setTimeout(() => {
        try {
          this.recognition.start();
        } catch (e) {
          console.error('Error restarting recognition:', e);
          this.isListening = false;
          this.ledStatus = 'inactive';
        }
      }, 100);
    } else {
      this.isListening = false;
      this.ledStatus = 'inactive';
    }
  }

  startListening() {
    if (!this.isSupported || this.isListening) {
      return;
    }
    
    try {
      this.recognition.start();
    } catch (e) {
      console.error('Error starting recognition:', e);
    }
  }

  stopListening() {
    if (!this.isSupported || !this.isListening) {
      return;
    }
    
    try {
      this.recognition.stop();
    } catch (e) {
      console.error('Error stopping recognition:', e);
      // Force status update even if error
      this.isListening = false;
      this.ledStatus = 'inactive';
    }
  }

  _toggleListening() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  _toggleAutoTranscribe(e) {
    // Material Web components use 'selected' instead of 'checked'
    const isSelected = e.target.selected;
    this.autoTranscribe = isSelected;
    
    // If enabling auto-transcribe and we're not already listening, start listening
    if (this.autoTranscribe && !this.isListening) {
      this.startListening();
    }
  }

  render() {
    const ledClasses = {
      'led': true,
      [`led-${this.ledStatus}`]: true
    };

    if (!this.isSupported) {
      return html`
        <div class="unsupported">
          <span>Speech recognition not supported in this browser</span>
        </div>
      `;
    }

    return html`
      <div class=${classMap(ledClasses)}></div>
      
      <div class="controls">
        <md-filled-tonal-button
          ?disabled=${!this.isSupported}
          @click=${this._toggleListening}
        >
          ${this.isListening ? 'Stop' : ''}
        </md-filled-tonal-button>
      </div>
      
      <div class="auto-transcribe">
        <span class="label">Speech</span>
        <md-switch
          ?disabled=${!this.isSupported}
          ?selected=${this.autoTranscribe}
          @change=${this._toggleAutoTranscribe}
        ></md-switch>
      </div>
    `;
  }
}

customElements.define('speech-to-text', SpeechToText);
