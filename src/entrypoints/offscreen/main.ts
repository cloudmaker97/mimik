import { env, pipeline, type TokenClassificationPipeline } from '@huggingface/transformers';

const MODEL_ID = 'onnx-community/piiranha-v1-detect-personal-information-ONNX';

env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;
env.useCustomCache = false;

const wasmPath = chrome.runtime.getURL('transformers/');
env.backends.onnx.wasm.wasmPaths = wasmPath;

let ner: TokenClassificationPipeline | null = null;

async function initModel(): Promise<{ ok: boolean; error?: string }> {
  if (ner) return { ok: true };
  try {
    ner = (await pipeline('token-classification', MODEL_ID, {
      dtype: 'fp32',
      device: 'wasm',
    })) as TokenClassificationPipeline;
    return { ok: true };
  } catch (err) {
    ner = null;
    return { ok: false, error: String(err) };
  }
}

interface TokenResult {
  word: string;
  entity: string;
  score: number;
  index: number;
  start: number;
  end: number;
}

interface Entity {
  text: string;
  label: string;
  score: number;
}

function postProcess(tokens: TokenResult[], originalText: string): Entity[] {
  const groups: { words: string[]; label: string; scores: number[]; lastIndex: number }[] = [];

  for (const token of tokens) {
    const label = token.entity.replace(/^[BI]-/, '');
    const isBegin = token.entity.startsWith('B-');
    const last = groups[groups.length - 1];

    if (!isBegin && last && last.label === label && token.index === last.lastIndex + 1) {
      last.words.push(token.word);
      last.scores.push(token.score);
      last.lastIndex = token.index;
    } else {
      groups.push({
        words: [token.word],
        label,
        scores: [token.score],
        lastIndex: token.index,
      });
    }
  }

  const entities: Entity[] = [];
  for (const group of groups) {
    const avgScore = group.scores.reduce((a, b) => a + b, 0) / group.scores.length;
    if (avgScore < 0.8) continue;

    const text = group.words
      .map((w) => w.replace(/^##/, '').replace(/^▁/, ''))
      .join('')
      .trim();
    if (text.length <= 1) continue;

    if (originalText.includes(text)) {
      entities.push({ text, label: group.label, score: avgScore });
    } else {
      const spaced = group.words
        .map((w) => w.replace(/^##/, '').replace(/^▁/, ' '))
        .join('')
        .trim();
      if (originalText.includes(spaced)) {
        entities.push({ text: spaced, label: group.label, score: avgScore });
      }
    }
  }

  return entities;
}

async function detect(text: string): Promise<{ entities: Entity[] }> {
  if (!ner) {
    const init = await initModel();
    if (!init.ok) return { entities: [] };
  }

  try {
    const results = await ner!(text, { ignore_labels: ['O'] });
    const tokens = (Array.isArray(results) ? results : [results]) as unknown as TokenResult[];
    return { entities: postProcess(tokens, text) };
  } catch {
    return { entities: [] };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'offscreen:ai:init') {
    initModel().then(sendResponse);
    return true;
  }
  if (msg.type === 'offscreen:ai:detect') {
    detect(msg.text).then(sendResponse);
    return true;
  }
  return false;
});

chrome.runtime.sendMessage({ type: 'offscreen:ready' });
