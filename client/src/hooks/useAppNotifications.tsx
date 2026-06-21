import { useEffect, useState } from 'react';
import { queryClient } from '@/lib/queryClient';

interface AppNotification {
  id: string;
  headerLabel: string;
  title: string;
  subtitle?: string;
  thumbnail_url?: string | null;
  accent?: 'primary' | 'alert';
}

export const useAppNotifications = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    // Determine WebSocket URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/notifications`;

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('Connected to notification WebSocket');
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'new_app' && message.data) {
              const notification: AppNotification = {
                id: message.data.id || Date.now().toString(),
                headerLabel: 'New Submission',
                title: message.data.title || 'New App',
                subtitle: `Team ${message.data.creator || 'Unknown'} shipped`,
                thumbnail_url: message.data.thumbnail_url,
              };
              setNotifications((prev) => [...prev, notification]);
            } else if (message.type === 'notification' && message.data) {
              const level = message.data.level as string | undefined;
              const notification: AppNotification = {
                id: Date.now().toString() + Math.random().toString(36).slice(2),
                headerLabel: message.data.title || 'Update',
                title: message.data.body || '',
                accent: level === 'challenge' ? 'alert' : 'primary',
              };
              setNotifications((prev) => [...prev, notification]);
            } else if (message.type === 'dashboard_update') {
              // Push live dashboard viewers to refetch immediately.
              queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('WebSocket connection closed, reconnecting in 3s...');
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch (error) {
        console.error('Error connecting to WebSocket:', error);
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return { notifications, removeNotification };
};
