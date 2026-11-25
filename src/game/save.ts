const KEY = "stillframe.save";
export type PostQuality = "low" | "medium" | "high";
export interface Settings {
  fov: number;
  sensitivity: number;
  invertY: boolean;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  resolutionScale: number;
  autoResolution: boolean;
  postQuality: PostQuality;
  showFps: boolean;
  reduceMotion: boolean;
  crosshairScale: number;
}
/** Settings keys whose value is a number (range sliders). */
export type NumericSettingKey = { [K in keyof Settings]: Settings[K] extends number ? K : never }[keyof Settings];
/** Settings keys whose value is a boolean (checkboxes). */
export type BooleanSettingKey = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];
export interface LevelRecord {
  cleared: boolean;
  /** Best real time in seconds. */
  best?: number;
  /** Simulated time of the best run in seconds. */
  bestSim?: number;
}
export interface SaveData {
  version: 1;
  settings: Settings;
  /** Keyed by level id. */
  levels: Partial<Record<string, LevelRecord>>;
}
function defaultSettings(): Settings {
  return {
    fov: 90,
    sensitivity: 1,
    invertY: false,
    masterVolume: 0.8,
    sfxVolume: 1,
    musicVolume: 0.5,
    resolutionScale: 1,
    autoResolution: true,
    postQuality: "high",
    showFps: false,
    reduceMotion: false,
    crosshairScale: 1
  };
}
export function loadSave(): SaveData {
  const fresh: SaveData = { version: 1, settings: defaultSettings(), levels: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw)
      return fresh;
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    if (parsed.version !== 1)
      return fresh;
    return {
      version: 1,
      settings: { ...defaultSettings(), ...parsed.settings ?? {} },
      levels: parsed.levels ?? {}
    };
  } catch (err) {
    console.warn("[save] could not read save data:", err);
    return fresh;
  }
}
export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("[save] could not write save data:", err);
  }
}
