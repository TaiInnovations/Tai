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

export async function* sendMessage(apiKey: string, model: AvailableModel, messages: Message[]): AsyncGenerator<string, void, unknown> {
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
      stream: true  // 启用流式输出
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

    if (!response.body) {
      throw new Error('响应体为空');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine === '') continue;
        if (trimmedLine === 'data: [DONE]') continue;
        
        // 处理特殊的状态消息
        if (trimmedLine.startsWith(': OPENROUTER')) {
          console.log('OpenRouter 状态消息:', trimmedLine);
          continue;
        }
        
        try {
          // 移除 'data: ' 前缀，如果有的话
          const cleanedLine = trimmedLine.startsWith('data: ') ? trimmedLine.slice(6) : trimmedLine;
          console.log('处理流数据行:', cleanedLine);
          
          const data = JSON.parse(cleanedLine);
          
          // 检查不同的响应格式
          let content = '';
          if (data.choices?.[0]?.delta?.content) {
            content = data.choices[0].delta.content;
          } else if (data.choices?.[0]?.message?.content) {
            content = data.choices[0].message.content;
          } else if (typeof data.content === 'string') {
            content = data.content;
          }
          
          if (content) {
            console.log('提取到内容:', content);
            yield content;
          }
        } catch (e) {
          // 只记录非特殊消息的解析错误
          if (!trimmedLine.startsWith(': ')) {
            console.warn('解析流数据失败:', e, '\n原始数据:', line);
            // 尝试提取错误消息
            if (line.includes('error')) {
              try {
                const errorStart = line.indexOf('{');
                if (errorStart !== -1) {
                  const errorJson = JSON.parse(line.slice(errorStart));
                  throw new Error(errorJson.error?.message || '未知错误');
                }
              } catch (parseError) {
                console.warn('解析错误消息失败:', parseError);
              }
            }
          }
        }
      }
    }

    // 处理最后可能的残余数据
    if (buffer.trim() !== '') {
      try {
        const data = JSON.parse(buffer.replace(/^data: /, ''));
        if (data.choices?.[0]?.delta?.content) {
          yield data.choices[0].delta.content;
        }
      } catch (e) {
        console.warn('解析最后的流数据失败:', e);
      }
    }
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
