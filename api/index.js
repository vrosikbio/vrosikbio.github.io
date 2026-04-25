import { createClient } from 'redis';

export default async function handler(req, res) {
  const client = createClient({ url: process.env.REDIS_URL });

  try {
    await client.connect();

    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress;
    
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    const fingerprint = Buffer.from(`${ip}-${userAgent}`).toString('base64');
    const key = `v:${fingerprint}`;

    const isNewUser = await client.set(key, '1', { NX: true });

    if (isNewUser) {
      await client.incr('views');
    }

    const views = await client.get('views');
    await client.disconnect();

    let totalViews = parseInt(views || 0) + 1000;
    res.status(200).json({ count: totalViews });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
