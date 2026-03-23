export interface Guide {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  stepIds: string[];
}

export interface Step {
  id: string;
  guideId: string;
  index: number;
  description: string;
  action: string;
  url: string;
  timestamp: number;
  screenshotId?: string;
}

export interface Screenshot {
  id: string;
  stepId: string;
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
}

export interface Settings {
  aiApiKey: string;
  aiProvider: 'openai' | 'anthropic';
}

export interface ElementMeta {
  tag: string; cssSelector: string; textContent: string | null;
  ariaLabel: string | null; placeholder: string | null; altText: string | null;
  name: string | null; role: string | null; href: string | null;
  inputType: string | null; dataTestId: string | null;
  rect: { x: number; y: number; width: number; height: number };
  devicePixelRatio: number;
}

export interface RrwebEventChunk { id: string; guideId: string; events: unknown[]; timestamp: number; }
