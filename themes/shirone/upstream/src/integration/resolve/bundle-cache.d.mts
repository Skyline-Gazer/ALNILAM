export function loadBundledArtifact(options: {
  outputDir: string;
  cacheKey: string;
  inputKey: string;
  build: () => Promise<string> | string;
}): Promise<{ file: string; hit: boolean }>;
