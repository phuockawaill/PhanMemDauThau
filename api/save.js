import { kv } from '@vercel/kv';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const packageData = request.body;
        if (!packageData || !packageData.filePath) {
            return response.status(400).json({ error: 'Missing package data or filePath' });
        }

        const id = packageData.filePath; // We use filePath (e.g. C:/HoSoMuaSam/...) as the ID
        await kv.set(`pkg:${id}`, packageData);

        // Update the index of recent packages
        let index = await kv.get('pkg_index') || [];
        if (!index.includes(id)) {
            index.push(id);
            await kv.set('pkg_index', index);
        }

        return response.status(200).json({ success: true, message: 'Package saved successfully' });
    } catch (error) {
        console.error('Error saving package:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}
