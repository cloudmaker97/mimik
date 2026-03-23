import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAIDescription } from '../src/background/ai-description';
import type { ElementMeta } from '../src/shared/types';

const mockOpenAICreate = vi.fn().mockResolvedValue({
  choices: [{ message: { content: 'Click the Submit button' } }],
});

const mockAnthropicCreate = vi.fn().mockResolvedValue({
  content: [{ type: 'text', text: 'Click the Submit button' }],
});

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      chat: {
        completions: {
          create: mockOpenAICreate,
        },
      },
    };
  }),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      messages: {
        create: mockAnthropicCreate,
      },
    };
  }),
}));

function makeMeta(): ElementMeta {
  return {
    tag: 'button',
    cssSelector: '#submit-btn',
    textContent: 'Submit',
    ariaLabel: null,
    placeholder: null,
    altText: null,
    name: null,
    role: 'button',
    href: null,
    inputType: null,
    dataTestId: null,
    rect: { x: 100, y: 200, width: 80, height: 32 },
    devicePixelRatio: 1,
  };
}

function makeBlob(): Blob {
  return new Blob(['test'], { type: 'image/jpeg' });
}

describe('getAIDescription', () => {
  const blob = makeBlob();
  const meta = makeMeta();

  beforeEach(() => {
    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: 'Click the Submit button' } }],
    });
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Click the Submit button' }],
    });
  });

  it('OpenAI provider returns description string from mocked completions.create', async () => {
    const result = await getAIDescription(blob, 'click', meta, 'openai', 'test-key');
    expect(result).toBe('Click the Submit button');
  });

  it('Anthropic provider returns description string from mocked messages.create', async () => {
    const result = await getAIDescription(blob, 'click', meta, 'anthropic', 'test-key');
    expect(result).toBe('Click the Submit button');
  });

  it('getAIDescription returns null when OpenAI API throws error', async () => {
    mockOpenAICreate.mockRejectedValueOnce(new Error('API Error'));
    const result = await getAIDescription(blob, 'click', meta, 'openai', 'bad-key');
    expect(result).toBeNull();
  });

  it('getAIDescription returns null when Anthropic API throws error', async () => {
    mockAnthropicCreate.mockRejectedValueOnce(new Error('API Error'));
    const result = await getAIDescription(blob, 'click', meta, 'anthropic', 'bad-key');
    expect(result).toBeNull();
  });

  it('Blob is converted to base64 and included in prompt', async () => {
    let capturedParams: unknown = null;
    mockOpenAICreate.mockImplementationOnce((params: unknown) => {
      capturedParams = params;
      return Promise.resolve({
        choices: [{ message: { content: 'Click the Submit button' } }],
      });
    });
    await getAIDescription(blob, 'click', meta, 'openai', 'test-key');
    const params = capturedParams as { messages: Array<{ content: Array<{ type: string; image_url?: { url: string } }> }> };
    expect(params).not.toBeNull();
    const content = params.messages[0].content;
    const imageContent = content.find((c) => c.type === 'image_url');
    expect(imageContent).toBeDefined();
    expect(imageContent?.image_url?.url).toMatch(/^data:image\/jpeg;base64,/);
  });
});
