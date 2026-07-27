import { kv } from '@vercel/kv';

export default async function handler(request, response) {
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const index = await kv.get('pkg_index') || [];
        
        // Fetch metadata for all packages
        const packages = [];
        for (const id of index) {
            const pkg = await kv.get(`pkg:${id}`);
            if (pkg) {
                // Just return the full package data for simplicity
                packages.push(pkg);
            }
        }

        return response.status(200).json({ success: true, packages });
    } catch (error) {
        console.error('Error listing packages:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}
