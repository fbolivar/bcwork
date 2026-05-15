export async function sendTeamsNotification(
  webhookUrl: string,
  title: string,
  text: string,
): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      themeColor: '0076D7',
      summary: title,
      sections: [{ activityTitle: `**${title}**`, activityText: text }],
    }),
  })
  if (!res.ok) throw new Error(`Teams webhook failed: ${res.status} ${await res.text()}`)
}
