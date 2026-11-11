type PresenceStatus =
  | 'connecting'
  | 'connected'
  | 'authenticated'
  | 'disconnected';

type PresenceCallbacks = {
  onStatusChange: (status: PresenceStatus) => void;
  onOnlinePlayers: (count: number) => void;
};

export function connectPresence(
  accessToken: string,
  callbacks: PresenceCallbacks,
) {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error('Missing EXPO_PUBLIC_API_URL configuration.');
  }

  const baseUrl = apiUrl.replace(/\/+$/, '');
  const wsUrl = baseUrl
    .replace(/^https:/, 'wss:')
    .replace(/^http:/, 'ws:');

  let socket: WebSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryDelay = 1000;
  let stopped = false;

  const connect = () => {
    if (stopped) return;

    callbacks.onStatusChange('connecting');

    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        if (stopped || !socket) return;

        retryDelay = 1000;
        callbacks.onStatusChange('connected');

        socket.send(
          JSON.stringify({
            type: 'AUTH',
            accessToken,
          }),
        );
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data));

          if (message.type === 'AUTHENTICATED') {
            callbacks.onStatusChange('authenticated');
          }

          if (
            message.type === 'ONLINE_STATS' &&
            typeof message.onlinePlayers === 'number'
          ) {
            callbacks.onOnlinePlayers(message.onlinePlayers);
          }
        } catch {
          console.warn('Received an invalid presence message.');
        }
      };

      socket.onerror = () => {
        console.warn('Brainy US presence connection encountered an error.');
      };

      socket.onclose = (event) => {
        socket = null;

        if (stopped) return;

        callbacks.onStatusChange('disconnected');

        // Authentication and protocol errors need a valid new session,
        // not repeated connection attempts with the same token.
        if ([4001, 4002, 4003].includes(event.code)) {
          return;
        }

        retryTimer = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30000);
      };
    } catch (error) {
      console.error('Unable to start presence connection:', error);

      if (!stopped) {
        callbacks.onStatusChange('disconnected');
        retryTimer = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30000);
      }
    }
  };

  connect();

  return () => {
    stopped = true;

    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }

    if (socket) {
      const activeSocket = socket;
      socket = null;
      activeSocket.onclose = null;
      activeSocket.close();
    }

    callbacks.onStatusChange('disconnected');
  };
}
