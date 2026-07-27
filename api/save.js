import { createClient } from 'redis';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const packageData = request.body;
        if (!packageData || !packageData.filePath) {
            return response.status(400).json({ error: 'Missing package data or filePath' });
        }

        const id = packageData.filePath; 
        
        const client = createClient({ url: process.env.REDIS_URL });
        client.on('error', err => console.log('Redis Client Error', err));
        await client.connect();

        await client.set(`pkg:${id}`, JSON.stringify(packageData));
        await client.sAdd('pkg_index', id); // Use a Set for the index

        await client.disconnect();

        return response.status(200).json({ success: true, message: 'Package saved successfully' });
    } catch (error) {
        console.error('Error saving package:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}
