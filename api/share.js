import { createClient } from 'redis';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { id, shareWith } = request.body;
        if (!id || !shareWith) {
            return response.status(400).json({ error: 'Missing id or shareWith' });
        }

        const client = createClient({ url: process.env.REDIS_URL });
        client.on('error', err => console.log('Redis Client Error', err));
        await client.connect();

        const pkgStr = await client.get(`pkg:${id}`);
        if (!pkgStr) {
            await client.disconnect();
            return response.status(404).json({ error: 'Package not found' });
        }

        const pkg = JSON.parse(pkgStr);
        if (!pkg.sharedWith) pkg.sharedWith = [];
        if (!pkg.sharedWith.includes(shareWith)) {
            pkg.sharedWith.push(shareWith);
            await client.set(`pkg:${id}`, JSON.stringify(pkg));
        }

        await client.disconnect();
        return response.status(200).json({ success: true, message: 'Package shared successfully' });
    } catch (error) {
        console.error('Error sharing package:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}
