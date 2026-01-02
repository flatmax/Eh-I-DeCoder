/**
 * ReconnectMixin - Provides automatic reconnection functionality for JRPC clients
 * 
 * Usage:
 * 1. Import: import {ReconnectMixin} from './mixins/ReconnectMixin.js';
 * 2. Apply: export class MyComponent extends ReconnectMixin(JRPCClient)
 * 3. In setupDone(): call this._resetReconnectState()
 * 4. In remoteDisconnected(): call this._scheduleReconnect()
 */
export const ReconnectMixin = (superClass) => class extends superClass {
  constructor() {
    super();
    this._reconnectInitialized = false;
    this._initReconnectState();
  }

  /**
   * Initialize reconnect state variables
   */
  _initReconnectState() {
    if (this._reconnectInitialized) return;
    
    this._reconnectTimeout = null;
    this._reconnectAttempts = 0;
    this._maxReconnectAttempts = 10;
    this._baseReconnectDelay = 1000; // 1 second
    this._maxReconnectDelay = 5000; // 5 seconds (5x base)
    this._reconnectInitialized = true;
  }

  /**
   * Reset reconnect state after successful connection
   */
  _resetReconnectState() {
    this._initReconnectState();
    this._reconnectAttempts = 0;
    
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
      this._reconnectTimeout = null;
    }
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  _scheduleReconnect() {
    this._initReconnectState();
    
    // Clear any existing timeout
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
      this._reconnectTimeout = null;
    }
    
    // Check if we've exceeded max attempts
    if (this._reconnectAttempts >= this._maxReconnectAttempts) {
      console.warn(`${this.constructor.name}: Max reconnect attempts (${this._maxReconnectAttempts}) reached`);
      return;
    }
    
    // Calculate delay with exponential backoff
    const delay = Math.min(
      this._baseReconnectDelay * Math.pow(1.5, this._reconnectAttempts),
      this._maxReconnectDelay
    );
    
    this._reconnectAttempts++;
    
    console.log(`${this.constructor.name}: Scheduling reconnect attempt ${this._reconnectAttempts}/${this._maxReconnectAttempts} in ${delay}ms`);
    
    this._reconnectTimeout = setTimeout(() => {
      console.log(`${this.constructor.name}: Attempting reconnect...`);
      this._reconnectTimeout = null;
      
      // Call serverChanged to trigger reconnection
      if (typeof this.serverChanged === 'function') {
        this.serverChanged();
      }
    }, delay);
  }

  /**
   * Cancel any pending reconnection
   */
  _cancelReconnect() {
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
      this._reconnectTimeout = null;
    }
  }

  /**
   * Clean up on disconnect
   */
  disconnectedCallback() {
    this._cancelReconnect();
    super.disconnectedCallback?.();
  }
};
