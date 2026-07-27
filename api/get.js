import { kv } from '@vercel/kv';

export default async function handler(request, response) {
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const id = request.query.id;
        if (!id) {
            return response.status(400).json({ error: 'Missing package id' });
        }

        const pkg = await kv.get(`pkg:${id}`);
        if (!pkg) {
            return response.status(404).json({ error: 'Package not found' });
        }

        return response.status(200).json({ success: true, package: pkg });
    } catch (error) {
        console.error('Error getting package:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}
