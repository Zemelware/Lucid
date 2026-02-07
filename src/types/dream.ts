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
  sfx_cues: SfxCue[];
};

export type NarratorAudioAsset = {
  blobUrl: string;
  text: string;
};

export type SfxAudioAsset = {
  blobUrl: string;
  cue: SfxCue;
};

export type DreamAudioAssets = {
  narrator: NarratorAudioAsset;
  sfx: SfxAudioAsset[];
};
