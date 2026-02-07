# **Lucid \- Development Plan**

## **Phase 1: Setup & Infrastructure**

* \[x\] **Init:** Next.js 15, Tailwind, Lucide-React.  
* \[x\] **Dependencies:** Install @openrouter/sdk, framer-motion, zustand.  
* \[x\] **Env:** Set up .env.local with OPENROUTER\_API\_KEY and ELEVENLABS\_API\_KEY.  
* \[x\] **Layout:** Build a full-screen image container.  
* \[x\] **Animation:** Implement the "Breathing" CSS animation (slow scale up/down loop, 15s duration).

## **Phase 2: The Dream Logic (OpenRouter SDK)**

* \[x\] **Client:** Set up the OpenRouter client in lib/openrouter.ts:  
  const client \= new OpenRouter({ apiKey: ... });  
* \[x\] **API:** Build /api/analyze-scene.  
* \[x\] **Prompt Engineering:** *Critical.*  
  \* *Persona:* "You are a Dream Guide."  
  \* *Instruction:* "Analyze this image. Write a hypnotic, second-person script. Identify 3 distinct sound sources and assign them strict 3D coordinates."  
  \* *Format:* Output strict JSON with narrative and sfx\_cues.  
* \[x\] **Implementation:** Use client.chat.send() with the model google/gemini-3-flash.

## **Phase 3: The Audio Layer (ElevenLabs)**

* \[x\] **Voice API:** Build /api/generate-voice. 
* \[x\] **SFX API:** Build /api/generate-sfx.  
* \[x\] **Optimization:** Ensure the browser pre-loads these audio blobs so playback is instant.

## **Phase 4: The Spatial Engine (Web Audio)**

* \[x\] **Hook:** Build useSpatialAudio.ts.  
* \[x\] **HRTF Setup:** Configure the PannerNode to use HRTF (this is what makes it sound 3D).  
* \[x\] **Mapping:** Map the Gemini x coordinate to the Panner positionX.  
  \* x \< 0 \= Left Ear.  
  \* x \> 0 \= Right Ear.  
  \* z \< 0 \= Behind Head.

## **Phase 5: Randomizer & Polish**

* \[x\] **Nano Banana:** Build /api/generate-image for the "Dream Button".  
* \[x\] **Prompt:** Use prompts like "liminal space", "ethereal bedroom", "mystical forest", "soft lighting" as examples for Gemini (Gemini should be given the context of the application and figure out what image to create)
* \[x\] **Readme:** Explain the "Binaural Audio" feature and recommend headphones for the best experience.

## **Phase 6**

* \[x\] **Playback controls:** Dedicated controls to play/pause audio (with appropriate icons) and scrub to different points in the audio
* \[x\] **Collapsible control panel:** The controls panel with all the buttons should be collapsible to see more of the image
* \[x\] **Readability of control panel:** if background underneath control panel is light then make control panel a dark tone to be readable and vice-versa (default to light mode)
