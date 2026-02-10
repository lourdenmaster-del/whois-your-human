import { NextResponse } from "next/server";
import OpenAI from "openai";
import { ENGINE_SPEC, IMAGE_PROMPT_SPEC } from "@/lib/engine-spec";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, birthDate, birthTime, birthLocation, email } = body;

    if (!fullName || !birthDate || !birthLocation || !email) {
      return NextResponse.json(
        { error: "Missing required fields: fullName, birthDate, birthLocation, email" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Server configuration error: OPENAI_API_KEY not set" },
        { status: 500 }
      );
    }

    const birthData = `
Full Name: ${fullName}
Birth Date: ${birthDate}
Birth Time: ${birthTime || "Unknown"}
Birth Location: ${birthLocation}
Email: ${email}
`.trim();

    // Generate report + emotional snippet
    const reportResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: ENGINE_SPEC },
        {
          role: "user",
          content: `Generate the full LIGS report and emotional snippet for this birth data:\n\n${birthData}\n\nOutput valid JSON only with exactly these keys: "full_report" (string, the complete 11-section report) and "emotional_snippet" (string, 1-2 poetic sentences). No other text.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const reportText = reportResponse.choices[0]?.message?.content;
    if (!reportText) {
      return NextResponse.json(
        { error: "No report generated" },
        { status: 500 }
      );
    }

    const reportData = JSON.parse(reportText) as {
      full_report?: string;
      emotional_snippet?: string;
    };

    const fullReport = reportData.full_report ?? "";
    const emotionalSnippet = reportData.emotional_snippet ?? "";

    // Generate image prompts based on report
    const imagePromptResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: IMAGE_PROMPT_SPEC },
        {
          role: "user",
          content: `Based on this LIGS report, generate 2 image prompts as a JSON object with key "image_prompts" (array of 2 strings):\n\n${fullReport.slice(0, 4000)}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const imagePromptText = imagePromptResponse.choices[0]?.message?.content;
    const imagePromptData = imagePromptText
      ? (JSON.parse(imagePromptText) as { image_prompts?: string[] })
      : { image_prompts: [] };
    const imagePrompts = imagePromptData.image_prompts ?? [];

    return NextResponse.json({
      status: "ok",
      full_report: fullReport,
      emotional_snippet: emotionalSnippet,
      image_prompts: imagePrompts,
    });
  } catch (err) {
    console.error("Engine error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Report generation failed: ${message}` },
      { status: 500 }
    );
  }
}
