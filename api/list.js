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
        
        const packages = [];
        for (const id of index) {
            const pkgStr = await client.get(`pkg:${id}`);
            if (pkgStr) {
                try {
                    const pkg = JSON.parse(pkgStr);
                    // Filter: Admin sees all, normal user sees only theirs
                    if (username && username !== 'admin') {
                        // Support legacy packages that have no author by assigning them to admin or visible to all?
                        // Let's make legacy packages visible only to admin to be safe, or just skip filter if author is missing.
                        if (pkg.author && pkg.author !== username) {
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
