# **Project: Lucid**

## **1\. High-Level Description**

**Lucid** is an intelligent **ASMR Dreamscape Generator**. It transforms any static image—whether a photo from your camera roll or an AI-generated scene—into a lucid, audio-visual dream.

The goal is to induce a "hypnagogic" state (the space between wakefulness and sleep). Lucid uses **Gemini 3 Flash** (via the OpenRouter SDK) to "dream" a narrative for the scene, writing a second-person script that guides the user into the world.

**The "Wow" Factor (Spatial Audio):**

Crucially, Lucid creates a **physically distinct 3D soundstage**. It doesn't just play stereo audio.

* If Gemini sees a river on the **left**, the user hears the water rushing *only* in their left ear.  
* If there is a fireplace **behind** the viewer in the image, the crackling sound comes from behind their head.  
* The narrator's voice feels intimate, close to the center, while the world expands around the user's periphery.

## **2\. Technology Stack**

* **Framework:** Next.js 16 (App Router) \+ React 19\.  
* **Styling:** Tailwind CSS \+ Framer Motion (Ethereal, floating animations).  
* **Language:** TypeScript (Strict mode).  
* **State Management:** Zustand (Audio graph state).  
* **Audio:** Web Audio API (Spatial PannerNodes & HRTF).

## **3\. Configuration & Security**

* **Environment Variables (.env.local):**  
  * OPENROUTER\_API\_KEY (Used for Gemini 3 Flash)  
  * ELEVENLABS\_API\_KEY

## **4\. Core AI Services (The Intelligence)**

### **A. Vision & Logic: OpenRouter SDK (Beta)**

* **Library:** @openrouter/sdk.  
* **Model:** google/gemini-3-flash.  
* **Role:**  
  1. Receives image (Multimodal input).  
  2. Outputs JSON via client.chat.send():  
     * narrative: String. A hypnotic, second-person script.
     * mood: String. Keywords for the voice style.  
     * sfx\_cues: Array of:  
       * prompt: String.  
       * position\_3d: { x: number, y: number, z: number }.  
         * *Constraint:* x controls Left/Right ear (-10 to 10). z controls Front/Back (-10 to 10).  
       * loop: Boolean.  
       * volume: Number (0.0 to 1.0).

### **B. Image Generation: Google Imagen (Nano Banana)**

* **Model:** gemini-2.5-flash-image (via OpenRouter).  
* **Role:** "Dream Button" (Randomize). Generates surreal, liminal spaces.

### **C. Audio Synthesis: ElevenLabs API**

* **Voice:** Eleven Multilingual v2 (voice ID: 1ykC5GeLM4dP82qkyo91).  

## **5\. The Audio Engine (Web Audio API)**

* **Context:** Standard AudioContext.  
* **Spatial Logic (The Dream Physics):**  
  * **Narrator:** Center channel (Omni-directional), slightly "close" (high gain).  
  * **SFX:** Each effect is connected to a PannerNode with panningModel: 'HRTF' (Head-Related Transfer Function).  
  * **The Effect:** This math simulates how sound waves hit the human ear, tricking the brain into perceiving depth and direction.  
* **Transitions:** All sounds must fade in/out (linearRampToValueAtTime) over 3-5 seconds.

## **6\. UI/UX Design Specifications**

* **Aesthetic:** "Ethereal Dreamscape".  
  * **Colors:** Deep purples, midnight blues, soft whites.  
  * **Vibe:** Float, drift, breathe. No hard lines or sharp corners.  
* **Visuals:**  
  * The Image covers the screen.  
  * **Breathing Effect:** The image slowly scales (1.0 \-\> 1.05) and pans slightly.  
  * **Glass Controls:** Floating, frosted glass UI elements.  
* **Typography:** Serif fonts for headers (e.g., *Playfair Display*), Sans-serif for controls.

## **7\. Folder Structure**

```
/src  
  /app  
    /api  
      /analyze-scene  \# OpenRouter SDK (Vision \-\> Dream Script \+ Spatial Cues)  
      /generate-sfx   \# ElevenLabs (Text \-\> Sound)  
      /generate-voice \# ElevenLabs (Text \-\> Whisper)  
      /generate-image \# Imagen (Text \-\> Visual)  
    /page.tsx  
  /components  
    /controls  
    /dream-canvas     \# The main visual container  
  /hooks  
    /useSpatialAudio  \# The PannerNode Logic  
    /useGemini        \# AI Logic (via OpenRouter SDK)  
```