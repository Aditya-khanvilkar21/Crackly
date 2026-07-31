import { supabase } from "@/integrations/supabase/client";
import type jsPDF from "jspdf";

export interface ClassBranding {
  className?: string;
  classAddress?: string;
  classLogoDataUrl?: string;
}

const toDataUrl = async (path: string): Promise<string | undefined> => {
  try {
    const { data: signed } = await supabase.storage
      .from("class-logos")
      .createSignedUrl(path, 120);
    if (!signed?.signedUrl) return undefined;
    const resp = await fetch(signed.signedUrl);
    if (!resp.ok) return undefined;
    const blob = await resp.blob();
    return await new Promise<string>((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as string);
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
};

/**
 * Resolve tuition class branding (name, address, logo) for PDF headers.
 * Pass a classId when known, otherwise the current admin's own class is used.
 */
export const getClassBranding = async (classId?: string | null): Promise<ClassBranding> => {
  try {
    let cls: { name: string; address: string | null; logo_url: string | null } | null = null;

    if (classId) {
      const { data } = await supabase
        .from("tuition_classes")
        .select("name, address, logo_url")
        .eq("id", classId)
        .maybeSingle();
      cls = (data as any) ?? null;
    }

    if (!cls) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return {};
      const { data } = await supabase
        .from("tuition_classes")
        .select("name, address, logo_url")
        .eq("admin_id", session.user.id)
        .order("created_at", { ascending: true })
        .limit(1);
      cls = (data && data.length > 0 ? (data[0] as any) : null);
    }

    if (!cls) return {};

    const classLogoDataUrl = cls.logo_url ? await toDataUrl(cls.logo_url) : undefined;
    return {
      className: cls.name || undefined,
      classAddress: cls.address || undefined,
      classLogoDataUrl,
    };
  } catch {
    return {};
  }
};

export const logoFormat = (dataUrl: string): string => {
  const m = /^data:image\/([a-zA-Z0-9.+-]+);/.exec(dataUrl);
  const t = (m?.[1] || "png").toLowerCase();
  if (t === "jpg" || t === "jpeg") return "JPEG";
  if (t === "webp") return "WEBP";
  return "PNG";
};

/**
 * Draws a branded header band with the class logo + class name.
 * Returns the Y coordinate right below the header.
 */
export const drawBrandedHeader = (
  doc: jsPDF,
  branding: ClassBranding,
  opts: { title: string; subtitle?: string; color?: [number, number, number] }
): number => {
  const W = doc.internal.pageSize.getWidth();
  const color = opts.color ?? [255, 106, 0];
  const bandH = 40;

  doc.setFillColor(color[0], color[1], color[2]);
  doc.rect(0, 0, W, bandH, "F");

  if (branding.classLogoDataUrl) {
    try {
      doc.addImage(branding.classLogoDataUrl, logoFormat(branding.classLogoDataUrl), 10, 6, 28, 28);
    } catch {
      /* ignore unsupported image */
    }
  }

  const textX = branding.classLogoDataUrl ? 44 : 14;
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text((branding.className || "Crackly").slice(0, 42), textX, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let y = 23;
  if (branding.classAddress) {
    doc.text(branding.classAddress.slice(0, 80), textX, y);
    y += 6;
  }
  doc.setFontSize(10);
  doc.text(opts.title, textX, y);
  if (opts.subtitle) {
    doc.setFontSize(8.5);
    doc.text(opts.subtitle.slice(0, 90), textX, y + 5.5);
  }

  return bandH + 10;
};
