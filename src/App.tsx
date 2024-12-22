import { useState, useEffect } from "react";
import { Button } from "./components/ui/button";
import { MessageSquare, Send } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { SettingsDialog, type Settings } from "./components/SettingsDialog";
import { loadSettings, saveSettings, getDefaultSettings } from "./lib/settings";
import { ThemeProvider, useTheme } from "./components/ThemeProvider";
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
    if (!input.trim() || !activeConversation) return;
    
    const newMessage: Message = { role: "user", content: input.trim() };
    
    setConversations(conversations.map(conv => {
      if (conv.id === activeConversation) {
        return {
          ...conv,
          messages: [...conv.messages, newMessage],
          lastMessage: input.trim(),
          timestamp: new Date().toLocaleString(),
          // 如果是第一条消息，将其设置为对话标题
          title: conv.messages.length === 0 ? input.trim().slice(0, 30) : conv.title
        };
      }
      return conv;
    }));
    
    setInput("");
    
    // TODO: Add AI response
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
              {currentConversation?.title || "Tai Chat"}
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
                {message.content}
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
