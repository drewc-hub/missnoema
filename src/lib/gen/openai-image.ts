import { getOpenAI } from "@/lib/openai";

export async function generateSafeImage(prompt: string) {
    const result = await getOpenAI().images.generate({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
    });

    const image = result.data?.[0];
    return image?.url ?? (
        image?.b64_json ? `data:image/png;base64,${image.b64_json}` : null
    );
}
