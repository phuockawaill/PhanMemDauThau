import { createClient } from 'redis';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const id = request.body.id;
        if (!id) {
            return response.status(400).json({ error: 'Missing package id' });
        }

        const client = createClient({ url: process.env.REDIS_URL });
        client.on('error', err => console.log('Redis Client Error', err));
        await client.connect();

        await client.del(`pkg:${id}`);
        await client.sRem('pkg_index', id);

        await client.disconnect();

        return response.status(200).json({ success: true, message: 'Package deleted successfully' });
    } catch (error) {
        console.error('Error deleting package:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}
