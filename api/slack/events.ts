// api/slack/events.ts
import { initBot, receiver } from "../../src/bot";

// Disable body parsing so Slack signature verification sees the raw body
export const config = {
    api: { bodyParser: false },
};

let initialized = false;

export default async function handler(req: any, res: any) {
    if (!initialized) {
        await initBot();
        initialized = true;
    }
    // Delegate to Bolt’s Express receiver (req/res are Express-compatible on Vercel)
    return receiver.app(req, res);
}