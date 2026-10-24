'use client';

import ToggleRow from '@/components/config/ToggleRow';
import type { AllConfigs, NotificationsConfig } from '@/types/config';

interface NotificationsSectionProps {
  notifications: NotificationsConfig;
  update: <S extends keyof AllConfigs, K extends keyof AllConfigs[S]>(
    section: S,
    key: K,
    value: AllConfigs[S][K]
  ) => void;
}

export function NotificationsSection({ notifications, update }: NotificationsSectionProps) {
  return (
    <div className="p-6 relative z-10">
      <h2 className="text-2xl font-audiowide text-white mb-6 pb-2 border-b border-purple-500/20">
        Notifications
      </h2>

      <div className="space-y-4">
        {/* Utilisation de ToggleRow et du store */}
        <ToggleRow
          label="Notifications par email"
          desc="Envoyer des notifications par email"
          value={notifications.emailNotifications}
          onChange={(checked) => update('notifications', 'emailNotifications', checked)}
        />
        <ToggleRow
          label="Alertes administrateur"
          desc="Recevoir des alertes pour les actions administratives"
          value={notifications.adminAlerts}
          onChange={(checked) => update('notifications', 'adminAlerts', checked)}
        />
        <ToggleRow
          label="Nouveaux utilisateurs"
          desc="Notifications lors de l'inscription de nouveaux utilisateurs"
          value={notifications.newUserNotifications}
          onChange={(checked) => update('notifications', 'newUserNotifications', checked)}
        />
        <ToggleRow
          label="Rappels d'événements"
          desc="Rappels automatiques avant les événements"
          value={notifications.eventReminders}
          onChange={(checked) => update('notifications', 'eventReminders', checked)}
        />
        <ToggleRow
          label="Emails marketing"
          desc="Envoyer des emails promotionnels aux utilisateurs"
          value={notifications.marketingEmails}
          onChange={(checked) => update('notifications', 'marketingEmails', checked)}
        />
      </div>
    </div>
  );
}
