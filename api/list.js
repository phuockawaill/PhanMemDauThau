import { createClient } from 'redis';

export default async function handler(request, response) {
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const client = createClient({ url: process.env.REDIS_URL });
        client.on('error', err => console.log('Redis Client Error', err));
        await client.connect();

        const index = await client.sMembers('pkg_index') || [];
        
        const packages = [];
        for (const id of index) {
            const pkgStr = await client.get(`pkg:${id}`);
            if (pkgStr) {
                try {
                    packages.push(JSON.parse(pkgStr));
                } catch(e) {}
            }
        }

        await client.disconnect();
        return response.status(200).json({ success: true, packages });
    } catch (error) {
        console.error('Error listing packages:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}
