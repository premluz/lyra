const DOWNLOAD_URL_LIFETIME_MS = 4_000;

export function download(content: Blob | string, filename: string, mime = 'application/json') {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_URL_LIFETIME_MS);
}

export function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
