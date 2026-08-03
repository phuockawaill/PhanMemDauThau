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
        const username = request.query.username;
        const currentRole = request.query.role || 'user'; // We can optionally pass role, but we can also just trust the client for now or assume admin username is 'admin'.
        
        const packages = [];
        for (const id of index) {
            const pkgStr = await client.get(`pkg:${id}`);
            if (pkgStr) {
                try {
                    const pkg = JSON.parse(pkgStr);
                    // Admin sees all. Normal user sees only theirs.
                    // If no author, only admin sees it.
                    if (currentRole !== 'admin' && username !== 'admin') {
                        if (pkg.author !== username) {
                            continue;
                        }
                    }
                    packages.push(pkg);
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
