import { useState, useEffect } from "react";
import { Button } from "./components/ui/button";
import { MessageSquare, Send, Copy, CheckCircle2 } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { SettingsDialog, type Settings } from "./components/SettingsDialog";
import { loadSettings, saveSettings, getDefaultSettings } from "./lib/settings";
import { ThemeProvider, useTheme } from "./components/ThemeProvider";
import { sendMessage, convertToApiMessage } from "./lib/api";
import { db, saveMessage, getMessagesByConversation, updateMessage } from "./lib/db";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import "./App.css";

// 生成唯一ID的辅助函数
const generateId = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
};

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
  const [copiedStates, setCopiedStates] = useState<{[key: string]: boolean}>({});
  const { theme, setTheme } = useTheme();

  // 加载所有会话
  useEffect(() => {
    const loadConversations = async () => {
      try {
        // 从数据库加载所有不同的会话ID
        const messages = await db.messages.toArray();
        console.log('从数据库加载的消息:', messages);
        
        const conversationMap = new Map<string, Conversation>();
        
        messages.forEach(msg => {
          console.log('处理消息:', msg);
          if (!conversationMap.has(msg.conversationId)) {
            console.log('创建新会话:', msg.conversationId);
            conversationMap.set(msg.conversationId, {
              id: msg.conversationId,
              title: "会话",  // 可以存储第一条消息的前30个字符
              lastMessage: msg.content,
              timestamp: msg.timestamp.toLocaleString(),
              messages: []
            });
          }
          const conversation = conversationMap.get(msg.conversationId)!;
          conversation.messages.push({
            role: msg.role,
            content: msg.content
          });
          console.log('更新会话消息:', conversation.messages);
        });

        const loadedConversations = Array.from(conversationMap.values());
        console.log('加载的所有会话:', loadedConversations);
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
      id: generateId(Math.random().toString(36).substr(2, 9)),
      title: "新对话",
      lastMessage: "",
      timestamp: new Date().toLocaleString(),
      messages: [],
    };
    setConversations([newConversation, ...conversations]);
    setActiveConversation(newConversation.id);
  };

  // 删除会话
  const handleDeleteConversation = async (id: string) => {
    try {
      // 从数据库中删除该会话的所有消息
      await db.messages.where('conversationId').equals(id).delete();
      
      // 从状态中移除会话
      setConversations(conversations.filter(conv => conv.id !== id));
      
      // 如果删除的是当前活跃会话，清除活跃会话
      if (activeConversation === id) {
        setActiveConversation(undefined);
      }
    } catch (error) {
      console.error('删除会话失败:', error);
    }
  };

  // 发送消息
  const handleSend = async () => {
    if (!input.trim()) return;
    
    let targetConversationId = activeConversation;
    let newConversation: Conversation | null = null;
    
    // 如果没有活跃对话，创建一个新对话
    if (!targetConversationId) {
      newConversation = {
        id: generateId(Math.random().toString(36).substr(2, 9)),
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
      
      // 创建一个初始的 AI 消息
      const aiMessage: Message = {
        role: "assistant",
        content: ""
      };

      console.log('准备保存 AI 消息到数据库, conversationId:', targetConversationId);
      
      // 保存初始的 AI 消息到数据库
      let savedMessage;
      try {
        savedMessage = await saveMessage({
          role: 'assistant',
          content: "",
          timestamp: new Date(),
          conversationId: targetConversationId
        });
        console.log('AI 消息保存成功:', savedMessage);
      } catch (error) {
        console.error('保存 AI 消息失败:', error);
        throw new Error('保存 AI 消息失败');
      }

      if (!savedMessage?.id) {
        console.error('保存的消息没有 ID');
        throw new Error('保存的消息没有 ID');
      }

      // 更新对话列表，添加初始的 AI 消息
      setConversations(prevConversations =>
        prevConversations.map(conv => {
          if (conv.id === targetConversationId) {
            return {
              ...conv,
              messages: [...conv.messages, aiMessage],
              lastMessage: "",
              timestamp: new Date().toLocaleString(),
            };
          }
          return conv;
        })
      );

      try {
        console.log('开始接收流式响应...');
        // 开始流式接收回复
        const messageStream = sendMessage(
          settings.openRouterKey,
          settings.model,
          apiMessages
        );

        let fullContent = "";
        for await (const chunk of messageStream) {
          fullContent += chunk;
          console.log('收到新的内容块，当前总长度:', fullContent.length);
          
          // 更新对话列表，更新 AI 消息的内容
          setConversations(prevConversations =>
            prevConversations.map(conv => {
              if (conv.id === targetConversationId) {
                const updatedMessages = [...conv.messages];
                updatedMessages[updatedMessages.length - 1] = {
                  role: "assistant",
                  content: fullContent
                };
                return {
                  ...conv,
                  messages: updatedMessages,
                  lastMessage: fullContent,
                  timestamp: new Date().toLocaleString(),
                };
              }
              return conv;
            })
          );
        }

        console.log('流式输出完成，准备更新数据库。消息ID:', savedMessage.id, '内容长度:', fullContent.length);
        // 流式输出完成后，更新数据库中的消息内容
        try {
          await updateMessage(savedMessage.id, fullContent);
          console.log('数据库更新成功');
        } catch (error) {
          console.error('更新数据库失败:', error);
          throw error;
        }
      } catch (apiError) {
        console.error('API 调用失败:', apiError);
        const errorContent = `错误: ${apiError instanceof Error ? apiError.message : '调用 API 失败'}`;
        
        // 更新对话列表中的错误消息
        setConversations(prevConversations =>
          prevConversations.map(conv => {
            if (conv.id === targetConversationId) {
              const updatedMessages = [...conv.messages];
              updatedMessages[updatedMessages.length - 1] = {
                role: "assistant",
                content: errorContent
              };
              return {
                ...conv,
                messages: updatedMessages,
                lastMessage: errorContent,
                timestamp: new Date().toLocaleString(),
              };
            }
            return conv;
          })
        );
        
        // 保存错误消息到数据库
        if (savedMessage?.id) {
          try {
            await updateMessage(savedMessage.id, errorContent);
          } catch (dbError) {
            console.error('保存错误消息到数据库失败:', dbError);
          }
        }
      }
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
    <div className="flex h-screen bg-background text-foreground">
      {/* 侧边栏 */}
      <Sidebar
        conversations={conversations}
        activeConversation={activeConversation}
        onSelectConversation={setActiveConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
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
                        const match = /language-(\w+)/.exec(className || '');
                        const language = match ? match[1] : '';
                        const codeContent = String(children).replace(/\n$/, '');

                        if (inline) {
                          return (
                            <code
                              className="font-mono text-sm text-primary"
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        }

                        let highlightedCode = codeContent;
                        if (language) {
                          try {
                            highlightedCode = hljs.highlight(codeContent, {
                              language,
                              ignoreIllegals: true
                            }).value;
                          } catch (e) {
                            console.warn('Failed to highlight:', e);
                          }
                        }

                        const [isCopied, setIsCopied] = useState(false);

                        const handleCopy = async (e: React.MouseEvent) => {
                          e.stopPropagation();
                          try {
                            const textArea = document.createElement('textarea');
                            textArea.value = codeContent;
                            document.body.appendChild(textArea);
                            textArea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textArea);
                            
                            setIsCopied(true);
                            setTimeout(() => setIsCopied(false), 2000);
                          } catch (err) {
                            console.error('复制失败:', err);
                          }
                        };

                        return (
                          <div className="relative group">
                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={handleCopy}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-800/50 hover:bg-zinc-800/80 transition-colors"
                              >
                                {isCopied ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                    <span className="text-xs text-green-500">已复制</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                                    <span className="text-xs text-zinc-400">复制</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="bg-zinc-900 p-4 rounded-lg overflow-x-auto">
                              <code
                                className={`font-mono text-[0.95rem] leading-relaxed hljs ${language}`}
                                dangerouslySetInnerHTML={{ __html: highlightedCode }}
                              />
                            </pre>
                          </div>
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
