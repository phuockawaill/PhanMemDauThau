import { kv } from '@vercel/kv';

const DEFAULT_ACCOUNTS = [
    { username: 'admin',  password: 'vnpt2026', displayName: 'Quản trị viên', role: 'admin' },
    { username: 'vnpt',   password: '123456',   displayName: 'Người dùng VNPT', role: 'user' },
    { username: 'user',   password: '123456',   displayName: 'Người dùng', role: 'user' },
];

export default async function handler(req, res) {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        if (req.method === 'GET') {
            let users = await kv.get('app_users');
            if (!users || !Array.isArray(users) || users.length === 0) {
                // Initialize default users if missing
                users = DEFAULT_ACCOUNTS;
                await kv.set('app_users', users);
            }
            res.status(200).json({ success: true, users });
        } else if (req.method === 'POST') {
            const { users } = req.body;
            
            if (!Array.isArray(users)) {
                return res.status(400).json({ success: false, error: 'Invalid data format, expected an array of users.' });
            }

            // Ensure admin account always exists and cannot be accidentally wiped entirely without an admin
            const hasAdmin = users.some(u => u.username === 'admin');
            if (!hasAdmin) {
                users.push(DEFAULT_ACCOUNTS[0]);
            }

            await kv.set('app_users', users);
            res.status(200).json({ success: true, message: 'Saved successfully.' });
        } else {
            res.setHeader('Allow', ['GET', 'POST']);
            res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
}
