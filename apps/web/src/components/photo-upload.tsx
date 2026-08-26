"use client";

import { UploadButton } from "@/lib/uploadthing";

// Snap/drag a photo → uploads to UploadThing → returns hosted URL(s).
// Requires UPLOADTHING_TOKEN in the environment; without it the button errors on
// use (the manual URL field remains as a fallback).
export function PhotoUpload({
  onUploaded,
}: {
  onUploaded: (urls: string[]) => void;
}) {
  return (
    <UploadButton
      endpoint="photo"
      onClientUploadComplete={(res) => {
        onUploaded(res.map((f) => f.ufsUrl ?? f.url));
      }}
      onUploadError={(e) => {
        console.error("Upload failed:", e.message);
      }}
      appearance={{
        button:
          "ut-ready:bg-primary ut-uploading:bg-primary/70 h-9 rounded-lg px-4 text-sm font-medium text-primary-foreground after:bg-primary/40",
        allowedContent: "text-xs text-muted-foreground",
      }}
      content={{ button: "Upload photo" }}
    />
  );
}
