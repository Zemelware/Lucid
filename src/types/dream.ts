export type Position3D = {
  x: number;
  y: number;
  z: number;
};

export type SfxCue = {
  prompt: string;
  position_3d: Position3D;
  loop: boolean;
  volume: number;
};

export type DreamSceneAnalysis = {
  narrative: string;
  mood: string;
  sfx_cues: [SfxCue, SfxCue, SfxCue];
};
