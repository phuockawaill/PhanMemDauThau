import { kv } from '@vercel/kv';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const id = request.body.id;
        if (!id) {
            return response.status(400).json({ error: 'Missing package id' });
        }

        await kv.del(`pkg:${id}`);

        // Update the index
        let index = await kv.get('pkg_index') || [];
        index = index.filter(pkgId => pkgId !== id);
        await kv.set('pkg_index', index);

        return response.status(200).json({ success: true, message: 'Package deleted successfully' });
    } catch (error) {
        console.error('Error deleting package:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}
