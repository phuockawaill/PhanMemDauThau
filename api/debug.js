export default function handler(req, res) {
    res.status(200).json({
        keys: Object.keys(process.env).filter(k => k.toLowerCase().includes('redis') || k.toLowerCase().includes('kv'))
    });
}