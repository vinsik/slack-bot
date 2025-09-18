import { App, ExpressReceiver } from "@slack/bolt";
import OpenAI from "openai";

const {
    SLACK_SIGNING_SECRET,
    SLACK_BOT_TOKEN,
    OPENAI_API_KEY,
    VECTOR_STORE_ID,
} = process.env as Record<string, string>;

if (!SLACK_SIGNING_SECRET || !SLACK_BOT_TOKEN) {
    throw new Error("Missing Slack env vars");
}

export const receiver = new ExpressReceiver({
    signingSecret: SLACK_SIGNING_SECRET,
});

const app = new App({
    token: SLACK_BOT_TOKEN,
    receiver,
});

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function answerWithFileSearch(userQ: string) {
    const sys = `You are a Slack helper bot. Use the file_search tool when needed.
Prefer concise, actionable answers. If nothing relevant is found, say so.`;
    const r = await openai.responses.create({
        model: "gpt-4o-mini",
        input: [
            { role: "system", content: sys },
            { role: "user", content: userQ },
        ],
        tools: [{ type: "file_search", vector_store_ids: [VECTOR_STORE_ID] }],
    });
    return r.output_text ?? "Sorry — I couldn’t generate a reply.";
}

// Mentions
app.event("app_mention", async ({ event, client }) => {
    const q = event.text.replace(/<@[^>]+>\s*/, "");
    const thread_ts = (event as any).thread_ts || (event as any).ts;

    const ackMsg = await client.chat.postMessage({
        channel: event.channel,
        thread_ts,
        text: "Searching the knowledge base… 🔎",
    });

    const answer = await answerWithFileSearch(q);

    await client.chat.postMessage({ channel: event.channel, thread_ts, text: answer });

    // Guard: only update if ts exists
    const ackTs = (ackMsg as any).ts as string | undefined;
    if (ackTs) {
        await client.chat.update({ channel: event.channel, ts: ackTs, text: "Answered ✅" });
    }
});

// Slash command (optional)
app.command("/ask", async ({ command, ack, respond }) => {
    await ack(); // must ack within 3s
    const answer = await answerWithFileSearch(command.text);
    await respond({ text: answer, response_type: "in_channel" });
});

export async function initBot() {
    // Nothing to start—Bolt attaches to ExpressReceiver which we’ll export to Vercel
    return app;
}
