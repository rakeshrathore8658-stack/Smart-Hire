import { useEffect, useRef } from 'react';

/**
 * useRealtimeSync
 * Subscribes to real-time sync events from WebSockets, cross-tab BroadcastChannel,
 * window visibility changes, and safety-net interval.
 *
 * @param {Function} onRefresh - Callback function to trigger data refetch
 * @param {Array<string>} [eventTypes] - Optional list of event names to listen for (e.g. ['RESUME_ANALYZED', 'RESUME_DELETED'])
 */
export const useRealtimeSync = (onRefresh, eventTypes = null) => {
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  useEffect(() => {
    const triggerRefresh = (detail) => {
      if (typeof refreshRef.current === 'function') {
        refreshRef.current(detail);
      }
    };

    // 1. Listen to global DOM sync event dispatched by NotificationSocket
    const handleSyncEvent = (event) => {
      const data = event.detail;
      if (!eventTypes || !data?.event || eventTypes.includes(data.event)) {
        triggerRefresh(data);
      }
    };

    window.addEventListener('smarthire:sync', handleSyncEvent);

    // 2. Listen to BroadcastChannel for instant same-browser cross-tab sync
    let channel = null;
    try {
      if (typeof window !== 'undefined' && window.BroadcastChannel) {
        channel = new BroadcastChannel('smarthire_sync_channel');
        channel.onmessage = (event) => {
          const data = event.data;
          if (!eventTypes || !data?.event || eventTypes.includes(data.event)) {
            triggerRefresh(data);
          }
        };
      }
    } catch (_) {}

    // 3. Tab visibility and focus listener: refresh automatically when switching back to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerRefresh({ event: 'TAB_ACTIVE' });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // 4. Background safety-net interval (every 25 seconds when page is active)
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        triggerRefresh({ event: 'HEARTBEAT_POLL' });
      }
    }, 25000);

    return () => {
      window.removeEventListener('smarthire:sync', handleSyncEvent);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      clearInterval(intervalId);
      if (channel) {
        try {
          channel.close();
        } catch (_) {}
      }
    };
  }, [eventTypes]);
};

export default useRealtimeSync;
