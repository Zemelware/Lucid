export type Position3D = {
  x: number;
  y: number;
  z: number;
};

export type TimelineSfxCue = {
  id: string;
  prompt: string;
  loop: boolean;
  volume: number;
  start_sec: number;
  end_sec: number;
  fade_in_sec?: number;
  fade_out_sec?: number;
  position_start: Position3D;
  position_end: Position3D;
};

export type DreamTimeline = {
  total_duration_sec: number;
  cues: TimelineSfxCue[];
};

export type DreamSceneAnalysis = {
  narrative: string;
  timeline: DreamTimeline;
};

export type NarratorAudioAsset = {
  blobUrl: string;
  text: string;
};

export type SfxAudioAsset = {
  blobUrl: string;
  cue: TimelineSfxCue;
};

export type DreamAudioAssets = {
  narrator: NarratorAudioAsset;
  sfx: SfxAudioAsset[];
  timeline: DreamTimeline;
};
