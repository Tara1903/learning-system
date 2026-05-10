import { NotificationModel } from "../../models/Notification.js";
import { env } from "../../config/env.js";
import { logger } from "../ops/logger.js";

export type NotificationChannel = "in-app" | "email" | "sms";

export interface NotificationDispatchInput {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

interface NotificationDeliveryProvider {
  channel: NotificationChannel;
  deliver: (input: NotificationDispatchInput) => Promise<void>;
}

const inAppProvider: NotificationDeliveryProvider = {
  channel: "in-app",
  deliver: async (input) => {
    await NotificationModel.create({
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      message: input.message,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId
    });
  }
};

function createFutureChannelProvider(channel: "email" | "sms"): NotificationDeliveryProvider {
  return {
    channel,
    deliver: async (input) => {
      if (env.nodeEnv !== "test") {
        logger.warn("Notification channel is not configured and delivery stayed in-app only.", {
          channel,
          recipientId: input.recipientId,
          title: input.title
        });
      }
    }
  };
}

const providerRegistry: Record<NotificationChannel, NotificationDeliveryProvider> = {
  "in-app": inAppProvider,
  email: createFutureChannelProvider("email"),
  sms: createFutureChannelProvider("sms")
};

export function resolveNotificationProviders(): NotificationDeliveryProvider[] {
  return env.notificationChannels.map((channel) => providerRegistry[channel]);
}

export async function dispatchNotification(input: NotificationDispatchInput): Promise<void> {
  const providers = resolveNotificationProviders();

  await Promise.all(providers.map((provider) => provider.deliver(input)));
}
