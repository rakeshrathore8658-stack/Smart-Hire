/**
 * Lightweight native STOMP-over-WebSocket client for SmartHire.
 * Provides real-time synchronization & notification push with zero external npm dependencies.
 */
export class NotificationSocket {
  constructor(userEmail, userRole, onNotification) {
    // Support legacy 2-arg signature: (userEmail, onNotification)
    if (typeof userRole === 'function') {
      this.onNotification = userRole;
      this.userRole = 'USER';
    } else {
      this.userRole = userRole ? userRole.toUpperCase() : 'USER';
      this.onNotification = onNotification;
    }
    this.userEmail = userEmail ? userEmail.trim().toLowerCase() : '';
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

    let url;
    const rawApiUrl = import.meta.env.VITE_API_BASE_URL;

    if (rawApiUrl && rawApiUrl.trim()) {
      try {
        const parsed = new URL(rawApiUrl.trim());
        const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
        url = `${wsProto}//${parsed.host}/ws-raw`;
      } catch (_) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        url = `${protocol}//${window.location.host}/ws-raw`;
      }
    } else {
      // Use current host or localhost:8080 in local dev
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host =
        window.location.port === '5173' || window.location.port === '3000'
          ? 'localhost:8080'
          : window.location.host;
      url = `${protocol}//${host}/ws-raw`;
    }

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

          const isHr = this.userRole === 'HR' || this.userRole === 'RECRUITER';
          // Only HR dashboards subscribe to live recruitment pipeline events
          if (isHr) {
            this.subscribe('/topic/recruitment');
          }

          // Each user ONLY subscribes to their private notification stream (no user-to-user leaks)
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

  updateUserEmail(newEmail, newRole) {
    const norm = newEmail ? newEmail.trim().toLowerCase() : '';
    const normRole = newRole ? newRole.toUpperCase() : this.userRole;
    if (norm === this.userEmail && normRole === this.userRole) return;
    this.userEmail = norm;
    this.userRole = normRole;
    if (this.connected) {
      const isHr = this.userRole === 'HR' || this.userRole === 'RECRUITER';
      if (isHr) {
        this.subscribe('/topic/recruitment');
      }
      if (norm) {
        this.subscribe(`/topic/notifications/${norm}`);
      }
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
