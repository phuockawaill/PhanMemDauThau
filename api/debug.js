export default function handler(req, res) {
    res.status(200).json({
        kvUrl: process.env.KV_REST_API_URL ? 'set' : 'missing',
        kvToken: process.env.KV_REST_API_TOKEN ? 'set' : 'missing'
    });
}
