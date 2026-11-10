/**
 * Lightweight native STOMP-over-WebSocket client for SmartHire.
 * Provides real-time synchronization & notification push with zero external npm dependencies.
 */
export class NotificationSocket {
  constructor(userEmail, onNotification) {
    this.userEmail = userEmail ? userEmail.trim().toLowerCase() : '';
    this.onNotification = onNotification;
    this.ws = null;
    this.connected = false;
    this.subId = 0;
    this.subscribedTopics = new Set();
    this.reconnectTimer = null;
    this.isClosedManually = false;

    // Cross-tab broadcast channel
    this.channel = null;
    try {
      if (typeof window !== 'undefined' && window.BroadcastChannel) {
        this.channel = new BroadcastChannel('smarthire_sync_channel');
      }
    } catch (_) {}
  }

  connect() {
    this.isClosedManually = false;

    // Use current host or localhost:8080
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host =
      window.location.port === '5173' || window.location.port === '3000'
        ? 'localhost:8080'
        : window.location.host;

    const url = `${protocol}//${host}/ws-raw`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        // Send STOMP CONNECT frame
        const connectFrame =
          'CONNECT\naccept-version:1.2,1.1,1.0\nheart-beat:10000,10000\n\n\0';
        this.ws.send(connectFrame);
      };

      this.ws.onmessage = (event) => {
        const data = event.data;
        if (!data) return;

        // Check if CONNECTED response
        if (data.startsWith('CONNECTED')) {
          this.connected = true;
          this.subscribedTopics.clear();

          // Core real-time topics
          this.subscribe('/topic/recruitment');
          this.subscribe('/topic/notifications/all');

          if (this.userEmail) {
            this.subscribe(`/topic/notifications/${this.userEmail}`);
          }
          return;
        }

        // Check if MESSAGE frame
        if (data.startsWith('MESSAGE')) {
          try {
            const splitIdx = data.indexOf('\n\n');
            if (splitIdx !== -1) {
              let body = data.substring(splitIdx + 2);
              if (body.endsWith('\0')) {
                body = body.substring(0, body.length - 1);
              }
              const parsed = JSON.parse(body);

              // 1. Dispatch global custom DOM event for all active pages
              window.dispatchEvent(
                new CustomEvent('smarthire:sync', { detail: parsed })
              );

              // 2. Broadcast to other tabs in the same browser session
              if (this.channel) {
                try {
                  this.channel.postMessage(parsed);
                } catch (_) {}
              }

              // 3. Dispatch to NotificationContext if it is a notification item
              if (this.onNotification && (parsed.title || parsed.id || parsed.message)) {
                this.onNotification(parsed);
              }
            }
          } catch (e) {
            console.warn('Could not parse incoming real-time payload:', e);
          }
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.subscribedTopics.clear();
        if (!this.isClosedManually) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => this.connect(), 4000);
        }
      };

      this.ws.onerror = () => {
        this.connected = false;
      };
    } catch (err) {
      this.connected = false;
    }
  }

  subscribe(destination) {
    if (!destination || this.subscribedTopics.has(destination)) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const subFrame = `SUBSCRIBE\nid:sub-${this.subId++}\ndestination:${destination}\nack:auto\n\n\0`;
    this.ws.send(subFrame);
    this.subscribedTopics.add(destination);
  }

  updateUserEmail(newEmail) {
    const norm = newEmail ? newEmail.trim().toLowerCase() : '';
    if (norm === this.userEmail) return;
    this.userEmail = norm;
    if (this.connected && norm) {
      this.subscribe(`/topic/notifications/${norm}`);
    }
  }

  disconnect() {
    this.isClosedManually = true;
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try {
        const disconnectFrame = 'DISCONNECT\n\n\0';
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(disconnectFrame);
        }
        this.ws.close();
      } catch (e) {}
    }
    if (this.channel) {
      try {
        this.channel.close();
      } catch (_) {}
    }
  }
}
