import type { AvailableModel } from './settings';

interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

interface Message {
  role: 'user' | 'assistant';
  content: MessageContent[] | string;
}

interface ChatCompletionRequest {
  model: AvailableModel;
  messages: Message[];
}

interface ChatCompletionResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
  }[];
}

export async function sendMessage(apiKey: string, model: AvailableModel, messages: Message[]): Promise<string> {
  try {
    console.log('发送消息到 API:', { model, messages });
    
    if (!apiKey) {
      throw new Error('请先在设置中配置 OpenRouter API Key');
    }

    const requestBody = {
      model,
      messages: messages.map(msg => ({
        ...msg,
        content: Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: msg.content }]
      })),
    };

    console.log('API 请求体:', requestBody);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Tai Chat',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('API 响应状态:', response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: '未知错误' } }));
      console.error('API 错误响应:', error);
      throw new Error(error.error?.message || `API 请求失败: ${response.status}`);
    }

    const data: ChatCompletionResponse = await response.json();
    console.log('API 响应数据:', data);
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('API 响应格式错误');
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('API 调用错误:', error);
    throw error;
  }
}

// 将普通消息转换为 API 消息格式
export function convertToApiMessage(message: { role: string; content: string }): Message {
  const apiMessage = {
    role: message.role as 'user' | 'assistant',
    content: [
      {
        type: 'text' as const,
        text: message.content,
      },
    ],
  };
  console.log('转换消息格式:', { original: message, converted: apiMessage });
  return apiMessage;
}
