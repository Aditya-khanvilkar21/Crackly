import { toPng } from "html-to-image";
import { supabase } from "@/integrations/supabase/client";
import katex from "katex";

/**
 * Pre-generates PNG images for all questions and options in a test.
 * Called after a test is created/edited. Updates the test record with image URLs.
 */

interface QuestionData {
  question: string;
  options: string[];
  questionImageUrl?: string;
  optionImageUrls?: string[];
  [key: string]: any;
}

/**
 * Renders LaTeX content to HTML string using KaTeX
 */
function renderLatexToHtml(content: string): string {
  if (!content) return "";

  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const trustFn = (ctx: { command: string; url?: string }) =>
    ctx.command !== "\\href" || !(ctx.url || "").toLowerCase().startsWith("javascript:");

  const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[^$]*?\$)/g);

  return parts
    .map((part) => {
      if (part.startsWith("$$") && part.endsWith("$$")) {
        const latex = part.slice(2, -2).trim();
        try {
          return katex.renderToString(latex, { displayMode: true, throwOnError: false, trust: trustFn });
        } catch { return escapeHtml(part); }
      }
      if (part.startsWith("$") && part.endsWith("$") && part.length > 1) {
        const latex = part.slice(1, -1).trim();
        try {
          return katex.renderToString(latex, { displayMode: false, throwOnError: false, trust: trustFn });
        } catch { return escapeHtml(part); }
      }
      return escapeHtml(part);
    })
    .join("");
}

/**
 * Creates a temporary DOM element, renders content, converts to PNG, uploads to storage.
 * Returns the public URL.
 */
async function renderAndUpload(
  content: string,
  storageKey: string,
  isOption: boolean = false
): Promise<string | null> {
  const container = document.createElement("div");
  container.style.cssText = `
    position: absolute; left: -9999px; top: -9999px;
    background: white; color: #1a1a1a;
    font-family: 'KaTeX_Main', 'Times New Roman', serif;
    ${isOption 
      ? "padding: 4px 12px; font-size: 15px; line-height: 1.5;" 
      : "padding: 16px; font-size: 16px; line-height: 1.6; max-width: 800px; white-space: pre-wrap;"
    }
  `;
  container.innerHTML = renderLatexToHtml(content);
  document.body.appendChild(container);

  try {
    // Wait for KaTeX fonts to render
    await new Promise((r) => setTimeout(r, 150));

    const dataUrl = await toPng(container, {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: isOption ? "transparent" : "white",
    });

    // Upload to storage
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const fileName = `question-images/${storageKey}.png`;

    const { error: uploadError } = await supabase.storage
      .from("test-questions")
      .upload(fileName, blob, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.warn("Upload failed for", storageKey, uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("test-questions")
      .getPublicUrl(fileName);

    return urlData?.publicUrl || null;
  } catch (err) {
    console.warn("Image generation failed for", storageKey, err);
    return null;
  } finally {
    document.body.removeChild(container);
  }
}

export interface PreGenProgress {
  current: number;
  total: number;
  phase: "questions" | "options";
}

/**
 * Pre-generates images for all questions and options in a test.
 * Updates the test record in the database with generated image URLs.
 * 
 * @param testId - The test UUID
 * @param questions - Array of question objects
 * @param onProgress - Optional callback for progress updates
 * @returns Updated questions array with image URLs
 */
export async function preGenerateTestImages(
  testId: string,
  questions: QuestionData[],
  onProgress?: (progress: PreGenProgress) => void
): Promise<QuestionData[]> {
  const updatedQuestions = questions.map(q => ({ ...q }));
  const totalItems = questions.length + questions.reduce((sum, q) => sum + q.options.length, 0);
  let completed = 0;

  // Phase 1: Generate question images
  for (let i = 0; i < updatedQuestions.length; i++) {
    const q = updatedQuestions[i];
    
    // Skip if already has a pre-generated image
    if (q.questionImageUrl) {
      completed++;
      continue;
    }

    const url = await renderAndUpload(q.question, `${testId}-q${i}`, false);
    if (url) {
      q.questionImageUrl = url;
    }
    completed++;
    onProgress?.({ current: completed, total: totalItems, phase: "questions" });
  }

  // Phase 2: Generate option images
  for (let i = 0; i < updatedQuestions.length; i++) {
    const q = updatedQuestions[i];
    
    if (!q.optionImageUrls) {
      q.optionImageUrls = [];
    }

    for (let j = 0; j < q.options.length; j++) {
      // Skip if already generated
      if (q.optionImageUrls[j]) {
        completed++;
        continue;
      }

      const url = await renderAndUpload(q.options[j], `${testId}-q${i}-opt${j}`, true);
      q.optionImageUrls[j] = url || "";
      completed++;
      onProgress?.({ current: completed, total: totalItems, phase: "options" });
    }
  }

  // Update the test in the database with image URLs
  const { error } = await supabase
    .from("tests")
    .update({ questions: updatedQuestions as any })
    .eq("id", testId);

  if (error) {
    console.error("Failed to update test with image URLs:", error);
  }

  return updatedQuestions;
}
