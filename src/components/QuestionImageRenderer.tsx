import { useState, useEffect, useRef, useCallback } from "react";
import { toPng } from "html-to-image";
import { supabase } from "@/integrations/supabase/client";
import { LatexRenderer } from "@/components/LatexRenderer";

interface QuestionImageRendererProps {
  questionId: string; // unique key: testId + questionIndex
  content: string; // LaTeX text
  cachedImageUrl?: string | null;
  className?: string;
  onImageGenerated?: (imageUrl: string) => void;
}

// In-memory cache to avoid re-generating during the same session
const imageCache = new Map<string, string>();

/**
 * Renders LaTeX content as a non-copyable image.
 * - If a cached image URL exists, uses it directly.
 * - Otherwise, renders LaTeX in a hidden div, converts to PNG,
 *   uploads to storage, and displays the image.
 */
export const QuestionImageRenderer = ({
  questionId,
  content,
  cachedImageUrl,
  className = "",
  onImageGenerated,
}: QuestionImageRendererProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(
    cachedImageUrl || imageCache.get(questionId) || null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(false);
  const hiddenRef = useRef<HTMLDivElement>(null);

  const generateImage = useCallback(async () => {
    if (!hiddenRef.current || !content || imageUrl) return;

    setIsGenerating(true);
    setError(false);

    try {
      // Small delay to let KaTeX render in the hidden div
      await new Promise((r) => setTimeout(r, 300));

      const dataUrl = await toPng(hiddenRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "white",
        style: {
          padding: "16px",
          fontSize: "16px",
          lineHeight: "1.6",
          color: "#1a1a1a",
          maxWidth: "800px",
        },
      });

      // Try to upload to storage for caching
      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const fileName = `question-images/${questionId}.png`;

        const { error: uploadError } = await supabase.storage
          .from("test-questions")
          .upload(fileName, blob, {
            contentType: "image/png",
            upsert: true,
          });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("test-questions")
            .getPublicUrl(fileName);

          if (urlData?.publicUrl) {
            const publicUrl = urlData.publicUrl;
            imageCache.set(questionId, publicUrl);
            setImageUrl(publicUrl);
            onImageGenerated?.(publicUrl);
            return;
          }
        }
      } catch {
        // If upload fails, fall back to data URL
      }

      // Fallback: use the data URL directly
      imageCache.set(questionId, dataUrl);
      setImageUrl(dataUrl);
    } catch (err) {
      console.error("Failed to generate question image:", err);
      setError(true);
    } finally {
      setIsGenerating(false);
    }
  }, [questionId, content, imageUrl, onImageGenerated]);

  useEffect(() => {
    if (!imageUrl && content) {
      generateImage();
    }
  }, [imageUrl, content, generateImage]);

  // If image generation failed, fall back to protected text rendering
  if (error) {
    return (
      <div
        className={`select-none ${className}`}
        style={{ userSelect: "none", WebkitUserSelect: "none" }}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
      >
        <LatexRenderer content={content} />
      </div>
    );
  }

  return (
    <>
      {/* Hidden div for LaTeX rendering (used for image generation) */}
      {!imageUrl && (
        <div
          ref={hiddenRef}
          style={{
            position: "absolute",
            left: "-9999px",
            top: "-9999px",
            background: "white",
            padding: "16px",
            fontSize: "16px",
            lineHeight: "1.6",
            color: "#1a1a1a",
            maxWidth: "800px",
            whiteSpace: "pre-wrap",
          }}
        >
          <LatexRenderer content={content} />
        </div>
      )}

      {/* Loading state */}
      {isGenerating && (
        <div className={`flex items-center gap-2 py-2 ${className}`}>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Rendering question...</span>
        </div>
      )}

      {/* Rendered image (anti-copy protected) */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          className={`max-w-full h-auto rounded ${className}`}
          style={{
            userSelect: "none",
            WebkitUserSelect: "none",
            pointerEvents: "none",
          }}
        />
      )}
    </>
  );
};

/**
 * Same component but for rendering option text as image.
 * Lighter version — doesn't upload to storage, uses data URL only.
 */
export const OptionImageRenderer = ({
  content,
  questionId,
  className = "",
}: {
  content: string;
  questionId: string;
  className?: string;
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(
    imageCache.get(questionId) || null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(false);
  const hiddenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (imageUrl || !content || !hiddenRef.current) return;

    const generate = async () => {
      setIsGenerating(true);
      try {
        await new Promise((r) => setTimeout(r, 200));
        const dataUrl = await toPng(hiddenRef.current!, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: "transparent",
          style: {
            padding: "4px 8px",
            fontSize: "15px",
            lineHeight: "1.5",
            color: "#1a1a1a",
          },
        });
        imageCache.set(questionId, dataUrl);
        setImageUrl(dataUrl);
      } catch {
        setError(true);
      } finally {
        setIsGenerating(false);
      }
    };

    generate();
  }, [imageUrl, content, questionId]);

  if (error) {
    return (
      <span
        className={`select-none ${className}`}
        style={{ userSelect: "none" }}
      >
        <LatexRenderer content={content} />
      </span>
    );
  }

  return (
    <>
      {!imageUrl && (
        <div
          ref={hiddenRef}
          style={{
            position: "absolute",
            left: "-9999px",
            top: "-9999px",
            background: "transparent",
            padding: "4px 8px",
            fontSize: "15px",
            lineHeight: "1.5",
            color: "#1a1a1a",
          }}
        >
          <LatexRenderer content={content} />
        </div>
      )}

      {isGenerating && (
        <span className="text-sm text-muted-foreground">...</span>
      )}

      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          className={`inline-block h-auto max-h-10 ${className}`}
          style={{
            userSelect: "none",
            WebkitUserSelect: "none",
            pointerEvents: "none",
          }}
        />
      )}
    </>
  );
};
