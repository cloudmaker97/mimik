import OpenAI from 'openai';
import type { ElementMeta } from '../shared/types';

export async function getAIDescription(
  blob: Blob,
  action: string,
  meta: ElementMeta,
  provider: 'openai' | 'anthropic',
  apiKey: string
): Promise<string | null> {
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  const targetText = meta.textContent || meta.ariaLabel || meta.placeholder || meta.tag;
  const prompt = `This is a browser screenshot. The highlighted element (blue border) is a ${meta.tag} with text "${targetText}". The user performed a "${action}" action on it. Write a single concise sentence describing this step (e.g., "Click the Submit button"). No preamble.`;

  try {
    if (provider === 'openai') {
      const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
            { type: 'text', text: prompt },
          ],
        }],
      });
      return response.choices[0]?.message?.content?.trim() || null;
    } else {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
            },
            { type: 'text', text: prompt },
          ],
        }],
      });
      const block = response.content[0];
      return block.type === 'text' ? block.text.trim() : null;
    }
  } catch (err) {
    console.error('[Mimik] AI description failed, using fallback', err);
    return null;
  }
}
