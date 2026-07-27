import { createClient } from 'redis';

export default async function handler(request, response) {
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const id = request.query.id;
        if (!id) {
            return response.status(400).json({ error: 'Missing package id' });
        }

        const client = createClient({ url: process.env.REDIS_URL });
        client.on('error', err => console.log('Redis Client Error', err));
        await client.connect();

        const pkgStr = await client.get(`pkg:${id}`);
        await client.disconnect();

        if (!pkgStr) {
            return response.status(404).json({ error: 'Package not found' });
        }

        return response.status(200).json({ success: true, package: JSON.parse(pkgStr) });
    } catch (error) {
        console.error('Error getting package:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}
