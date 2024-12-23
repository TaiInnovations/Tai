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
  return await db.messages.add(message);
}

export async function getMessagesByConversation(conversationId: string) {
  return await db.messages
    .where('conversationId')
    .equals(conversationId)
    .toArray();
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
