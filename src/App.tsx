import { useState, useEffect } from "react";
import { Button } from "./components/ui/button";
import { MessageSquare, Send } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { SettingsDialog, type Settings } from "./components/SettingsDialog";
import { loadSettings, saveSettings, getDefaultSettings } from "./lib/settings";
import { ThemeProvider, useTheme } from "./components/ThemeProvider";
import { sendMessage, convertToApiMessage } from "./lib/api";
import { db, saveMessage, getMessagesByConversation } from "./lib/db";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import "./App.css";

// 生成唯一ID的辅助函数
const generateId = () => Math.random().toString(36).substr(2, 9);

interface Message {
  role: string;
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  messages: Message[];
}

function AppContent() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [settings, setSettings] = useState<Settings>(getDefaultSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  // 加载所有会话
  useEffect(() => {
    const loadConversations = async () => {
      try {
        // 从数据库加载所有不同的会话ID
        const messages = await db.messages.toArray();
        const conversationMap = new Map<string, Conversation>();
        
        messages.forEach(msg => {
          if (!conversationMap.has(msg.conversationId)) {
            conversationMap.set(msg.conversationId, {
              id: msg.conversationId,
              title: "会话",  // 可以存储第一条消息的前30个字符
              lastMessage: msg.content,
              timestamp: msg.timestamp.toLocaleString(),
              messages: []
            });
          }
          conversationMap.get(msg.conversationId)!.messages.push({
            role: msg.role,
            content: msg.content
          });
        });

        const loadedConversations = Array.from(conversationMap.values());
        setConversations(loadedConversations);
      } catch (error) {
        console.error('加载会话失败:', error);
      }
    };

    loadConversations();
  }, []);

  // 加载设置
  useEffect(() => {
    loadSettings().then((savedSettings) => {
      console.log('App: Loading settings:', savedSettings);
      setSettings(savedSettings);
      setTheme(savedSettings.theme);
    });
  }, [setTheme]);

  // 监听主题变化
  useEffect(() => {
    console.log('App: Theme changed to:', theme);
    console.log('App: HTML classes:', document.documentElement.classList.toString());
  }, [theme]);

  // 获取当前活跃的对话
  const currentConversation = conversations.find(
    (conv) => conv.id === activeConversation
  );

  // 创建新对话
  const handleNewChat = () => {
    const newConversation: Conversation = {
      id: generateId(),
      title: "新对话",
      lastMessage: "",
      timestamp: new Date().toLocaleString(),
      messages: [],
    };
    setConversations([newConversation, ...conversations]);
    setActiveConversation(newConversation.id);
  };

  // 发送消息
  const handleSend = async () => {
    if (!input.trim()) return;
    
    let targetConversationId = activeConversation;
    let newConversation: Conversation | null = null;
    
    // 如果没有活跃对话，创建一个新对话
    if (!targetConversationId) {
      newConversation = {
        id: generateId(),
        title: input.trim().slice(0, 30),
        lastMessage: input.trim(),
        timestamp: new Date().toLocaleString(),
        messages: [],
      };
      setConversations(prevConversations => [newConversation!, ...prevConversations]);
      targetConversationId = newConversation.id;
      setActiveConversation(targetConversationId);
    }
    
    const userMessage: Message = { role: "user", content: input.trim() };
    console.log('发送用户消息:', userMessage);
    
    // 保存用户消息到数据库
    await saveMessage({
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      conversationId: targetConversationId
    });
    
    // 更新对话列表，添加用户消息
    setConversations(prevConversations => 
      prevConversations.map(conv => {
        if (conv.id === targetConversationId) {
          const updatedConv = {
            ...conv,
            messages: [...conv.messages, userMessage],
            lastMessage: input.trim(),
            timestamp: new Date().toLocaleString(),
          };
          return updatedConv;
        }
        return conv;
      })
    );

    setInput("");

    try {
      const apiMessages = currentConversation?.messages.map(convertToApiMessage) || [];
      apiMessages.push(convertToApiMessage(userMessage));
      
      const response = await sendMessage(
        settings.openRouterKey,
        settings.model,
        apiMessages
      );

      const assistantMessage: Message = {
        role: "assistant",
        content: response,
      };

      // 保存助手消息到数据库
      await saveMessage({
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        conversationId: targetConversationId
      });

      // 更新对话列表，添加助手消息
      setConversations(prevConversations =>
        prevConversations.map(conv => {
          if (conv.id === targetConversationId) {
            return {
              ...conv,
              messages: [...conv.messages, assistantMessage],
              lastMessage: response,
              timestamp: new Date().toLocaleString(),
            };
          }
          return conv;
        })
      );
    } catch (error) {
      console.error('发送消息失败:', error);
      // 显示错误消息给用户
      const errorMessage: Message = {
        role: "assistant",
        content: `错误: ${error instanceof Error ? error.message : '发送消息失败'}`,
      };
      setConversations(prevConversations =>
        prevConversations.map(conv => {
          if (conv.id === targetConversationId) {
            return {
              ...conv,
              messages: [...conv.messages, errorMessage],
              lastMessage: errorMessage.content,
              timestamp: new Date().toLocaleString(),
            };
          }
          return conv;
        })
      );
    }
  };

  // 处理设置保存
  const handleSaveSettings = async (newSettings: Settings) => {
    console.log('App: Saving settings:', newSettings);
    setSettings(newSettings);
    await saveSettings(newSettings);
    setTheme(newSettings.theme);
    setIsSettingsOpen(false);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* 侧边栏 */}
      <Sidebar
        conversations={conversations}
        activeConversation={activeConversation}
        onSelectConversation={setActiveConversation}
        onNewChat={handleNewChat}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部标题栏 */}
        <header className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-6 h-6" />
            <h1 className="text-xl font-bold">
              {activeConversation ? (currentConversation?.title || "新对话") : "新对话"}
            </h1>
          </div>
        </header>

        {/* 聊天区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {currentConversation?.messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {message.role === "assistant" ? (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    className="prose prose-sm dark:prose-invert max-w-none"
                    components={{
                      // 自定义代码块样式
                      code({ node, inline, className, children, ...props }) {
                        return (
                          <code
                            className={`${className} ${
                              inline
                                ? 'bg-muted px-1 py-0.5 rounded text-sm'
                                : 'block bg-muted/50 p-2 rounded-md text-sm overflow-x-auto'
                            }`}
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                      // 自定义链接样式
                      a({ node, children, href, ...props }) {
                        return (
                          <a
                            href={href}
                            className="text-primary hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                            {...props}
                          >
                            {children}
                          </a>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 输入区域 */}
        <div className="border-t p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="输入消息..."
              className="flex-1 min-h-[40px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <Button onClick={handleSend}>
              <Send className="w-4 h-4 mr-2" />
              发送
            </Button>
          </div>
        </div>
      </div>

      {/* 设置对话框 */}
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        initialSettings={settings}
      />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
