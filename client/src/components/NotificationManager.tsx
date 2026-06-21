import { useAppNotifications } from '@/hooks/useAppNotifications';
import AppNotification from './AppNotification';

const NotificationManager = () => {
  const { notifications, removeNotification } = useAppNotifications();

  return (
    <div className="fixed right-4 top-20 z-50 flex flex-col gap-3 pointer-events-none">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <AppNotification
            headerLabel={notification.headerLabel}
            title={notification.title}
            subtitle={notification.subtitle}
            thumbnail_url={notification.thumbnail_url}
            accent={notification.accent}
            onClose={() => removeNotification(notification.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default NotificationManager;
