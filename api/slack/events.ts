import type { VercelRequest, VercelResponse } from "@vercel/node";
import { initBot, receiver } from "../../src/bot";

// Disable body parsing (Slack signature verification needs raw body)
export const config = {
    api: { bodyParser: false },
};

let initialized = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!initialized) {
        await initBot();
        initialized = true;
    }
    // Delegate to Bolt's Express receiver
    // @ts-ignore - Vercel types are compatible with Express types at runtime
    return receiver.app(req, res);
}
