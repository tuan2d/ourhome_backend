export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  if (!token) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: token, title, body, sound: 'default', data }),
    });
  } catch (err) {
    console.error('[Push] Failed to send notification:', err);
  }
}
