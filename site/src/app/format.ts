/** size-limit's own units: bytes under 1 kB, otherwise kB with one decimal (1 kB = 1000 B). */
export const formatBytes = (bytes: number): string => (bytes < 1000 ? `${bytes} B` : `${(bytes / 1000).toFixed(1)} kB`);
