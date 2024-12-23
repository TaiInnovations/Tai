import Dexie, { Table } from 'dexie';

export interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  conversationId: string;
}

export interface Settings {
  id?: number;
  key: string;
  value: any;
  updatedAt: Date;
}

export class TaiDB extends Dexie {
  messages!: Table<ChatMessage>;
  settings!: Table<Settings>;

  constructor() {
    super('TaiDB');
    this.version(1).stores({
      messages: '++id, conversationId, role, timestamp',
      settings: '++id, key, updatedAt'
    });
  }
}

export const db = new TaiDB();

// 辅助函数
export async function saveMessage(message: Omit<ChatMessage, 'id'>) {
  console.log('开始保存消息:', message);
  try {
    const id = await db.messages.add(message);
    const savedMessage = await db.messages.get(id);
    console.log('消息保存成功:', savedMessage);
    return savedMessage;
  } catch (error) {
    console.error('保存消息失败:', error);
    throw error;
  }
}

export async function updateMessage(id: number, content: string) {
  console.log('开始更新消息:', { id, contentLength: content.length });
  try {
    const message = await db.messages.get(id);
    if (!message) {
      throw new Error(`消息不存在: ${id}`);
    }
    
    const count = await db.messages.update(id, {
      ...message,
      content: content
    });
    
    if (count === 0) {
      throw new Error(`更新消息失败，没有找到ID: ${id}`);
    }
    
    const updatedMessage = await db.messages.get(id);
    console.log('消息更新成功:', updatedMessage);
    return updatedMessage;
  } catch (error) {
    console.error('更新消息失败:', error);
    throw error;
  }
}

export async function getMessagesByConversation(conversationId: string) {
  console.log('获取会话消息:', conversationId);
  try {
    const messages = await db.messages
      .where('conversationId')
      .equals(conversationId)
      .toArray();
    console.log('获取到消息数量:', messages.length);
    return messages;
  } catch (error) {
    console.error('获取会话消息失败:', error);
    throw error;
  }
}

export async function setSetting(key: string, value: any) {
  const existingSetting = await db.settings.where('key').equals(key).first();
  if (existingSetting) {
    return await db.settings.update(existingSetting.id!, {
      value,
      updatedAt: new Date()
    });
  }
  return await db.settings.add({
    key,
    value,
    updatedAt: new Date()
  });
}

export async function getSetting(key: string) {
  const setting = await db.settings.where('key').equals(key).first();
  return setting?.value;
}

export async function getAllSettings() {
  return await db.settings.toArray();
}
