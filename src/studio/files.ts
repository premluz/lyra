import type { Project } from '../engine/types';
import { parseProject } from '../engine/validation';
import { STUDIO } from './constants';

export function download(content: Blob | string, filename: string, mime = 'application/json') {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type: mime }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), STUDIO.toastMs);
}
export function slug(name: string) { return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'particle-experience'; }
export async function readProject(file: File): Promise<Project> {
  if (file.size > STUDIO.importMaxBytes) throw new Error('Project files must be smaller than 1 MB.');
  return parseProject(JSON.parse(await file.text()));
}
export function message(error: unknown) { return error instanceof Error ? error.message : String(error); }
