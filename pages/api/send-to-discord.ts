import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { imageUrl, senderName, conversationId } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required.' });
    }

    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!discordWebhookUrl) {
      console.error('DISCORD_WEBHOOK_URL is not set in environment variables.');
      return res.status(500).json({ error: 'Discord webhook URL is not configured.' });
    }

    try {
      const response = await fetch(discordWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: `New image from ${senderName || 'a user'} in conversation ${conversationId || 'unknown'}:`,
          embeds: [
            {
              image: {
                url: imageUrl,
              },
            },
          ],
        }),
      });

      if (response.ok) {
        return res.status(200).json({ message: 'Image sent to Discord successfully.' });
      } else {
        const errorData = await response.text();
        console.error(`Failed to send image to Discord: ${response.status} - ${errorData}`);
        return res.status(response.status).json({ error: 'Failed to send image to Discord.', details: errorData });
      }
    } catch (error) {
      console.error('Error sending image to Discord:', error);
      return res.status(500).json({ error: 'Internal server error while sending image to Discord.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
