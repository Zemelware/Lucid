"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";

import { motion } from "framer-motion";
import Image from "next/image";

import { DreamControls } from "@/components/controls/dream-controls";

type DreamCanvasProps = {
  imageSrc?: string;
};

export function DreamCanvas({ imageSrc = "/dream-placeholder.svg" }: DreamCanvasProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (uploadedImageUrl) {
        URL.revokeObjectURL(uploadedImageUrl);
      }
    };
  }, [uploadedImageUrl]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadedImageUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }

      return URL.createObjectURL(file);
    });

    event.currentTarget.value = "";
  };

  const activeImageSrc = uploadedImageUrl ?? imageSrc;
  const isBlobImage = activeImageSrc.startsWith("blob:");

  return (
    <section className="relative h-full w-full overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageChange}
      />

      <div className="dream-breath absolute inset-0 will-change-transform">
        <Image
          src={activeImageSrc}
          alt="Liminal dreamscape"
          fill
          priority
          sizes="100vw"
          unoptimized={isBlobImage}
          className="object-cover"
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/45 via-slate-950/35 to-slate-950/80" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        className="relative z-10 flex h-full w-full items-end justify-center p-6 sm:p-10"
      >
        <DreamControls onUploadClick={handleUploadClick} />
      </motion.div>
    </section>
  );
}
