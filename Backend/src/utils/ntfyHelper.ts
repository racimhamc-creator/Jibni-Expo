/**
 * NTFY Notification Helper
 * Sends push notifications via ntfy.sh for mission/ride updates
 */

const NTFY_TOPIC = process.env.NTFY_TOPIC || 'missions_oran';
const NTFY_URL = `https://ntfy.sh/${NTFY_TOPIC}`;

/**
 * Send notification to ntfy topic
 * Wrapped in try/catch to ensure API doesn't fail if ntfy is down
 */
export async function sendNtfyNotification(
  title: string,
  message: string,
  missionId?: string,
  status?: string
): Promise<void> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Priority': 'high',
      'Tags': 'car',
    };

    if (missionId) {
      headers['Click'] = `myapp://mission/${missionId}`;
    }

    const response = await fetch(NTFY_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title,
        message,
      }),
    });

    if (response.ok) {
      console.log(`✅ NTFY notification sent: ${title}`);
    } else {
      console.warn(`⚠️ NTFY notification failed: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ NTFY notification error:', error);
    // Don't throw - this should never break the API
  }
}

/**
 * Format mission/ride data into clean notification body
 * NO sensitive data (phone numbers, personal info)
 */
export function formatMissionNotification(
  pickup: string,
  destination: string,
  price: number,
  status: string
): string {
  return `🚗 Pickup: ${pickup}
📍 Destination: ${destination}
💰 Price: ${price} DA
📊 Status: ${status}`;
}

/**
 * Send mission created notification
 */
export async function notifyMissionCreated(
  pickup: string,
  destination: string,
  price: number,
  missionId: string
): Promise<void> {
  const title = '🚗 New Mission';
  const message = formatMissionNotification(pickup, destination, price, 'Pending');
  
  await sendNtfyNotification(title, message, missionId, 'pending');
}

/**
 * Send mission status updated notification
 */
export async function notifyMissionStatusUpdate(
  pickup: string,
  destination: string,
  price: number,
  missionId: string,
  newStatus: string
): Promise<void> {
  const statusEmoji = getStatusEmoji(newStatus);
  const title = `📍 Mission ${statusEmoji} ${newStatus}`;
  const message = formatMissionNotification(pickup, destination, price, newStatus);
  
  await sendNtfyNotification(title, message, missionId, newStatus);
}

/**
 * Get status emoji for notification
 */
function getStatusEmoji(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '⏳',
    searching: '🔍',
    assigned: '👤',
    accepted: '✅',
    driver_arrived: '🚗',
    in_progress: '🏃',
    completed: '🎉',
    cancelled: '❌',
  };
  return statusMap[status] || '';
}