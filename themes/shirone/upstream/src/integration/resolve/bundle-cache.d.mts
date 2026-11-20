export function loadBundledArtifact(options: {
  outputDir: string;
  artifactStoreDir: string;
  cacheKey: string;
  inputKey: string;
  build: () => Promise<string> | string;
}): Promise<{ file: string; url: string; hit: boolean }>;
