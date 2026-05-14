import { getOpenAI } from "@/lib/openai";

export async function generateSafeImage(prompt: string) {
    const result = await getOpenAI().images.generate({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
        nsfw: true,
    });

    return result.data?.[0]?.url ?? null;
}
