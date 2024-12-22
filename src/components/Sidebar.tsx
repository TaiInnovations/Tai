import { MessageSquarePlus, Settings } from "lucide-react";
import { Button } from "./ui/button";

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
}

interface SidebarProps {
  conversations: Conversation[];
  activeConversation?: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
}

export function Sidebar({
  conversations,
  activeConversation,
  onSelectConversation,
  onNewChat,
  onOpenSettings,
}: SidebarProps) {
  return (
    <div className="w-64 border-r bg-muted/10 flex flex-col h-full">
      {/* 软件标题 */}
      <div className="pt-8 pb-4 px-4 border-b">
        <h1 className="text-xl font-bold">Tai Chat</h1>
      </div>

      {/* 顶部按钮区域 */}
      <div className="p-4">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={onNewChat}
        >
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          新对话
        </Button>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={`w-full text-left p-3 hover:bg-accent/50 flex flex-col space-y-1 ${
              activeConversation === conversation.id ? "bg-accent" : ""
            }`}
          >
            <span className="font-medium truncate">{conversation.title}</span>
            <span className="text-sm text-muted-foreground truncate">
              {conversation.lastMessage}
            </span>
            <span className="text-xs text-muted-foreground">
              {conversation.timestamp}
            </span>
          </button>
        ))}
      </div>

      {/* 底部设置按钮 */}
      <div className="p-4 border-t mt-auto">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={onOpenSettings}
        >
          <Settings className="mr-2 h-4 w-4" />
          设置
        </Button>
      </div>
    </div>
  );
}
