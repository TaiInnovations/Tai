import { MessageSquarePlus, Settings, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { useState, useCallback, useEffect } from "react";

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
  onDeleteConversation: (id: string) => void;
  onOpenSettings: () => void;
}

export function Sidebar({
  conversations,
  activeConversation,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onOpenSettings,
}: SidebarProps) {
  const [width, setWidth] = useState(256);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.userSelect = 'auto';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newWidth = e.clientX;
      setWidth(Math.max(200, Math.min(400, newWidth)));
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="flex h-full">
      <div style={{ width: `${width}px` }} className="border-r bg-muted/10 flex flex-col h-full">
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
            <div
              key={conversation.id}
              className={`group relative p-3 hover:bg-accent/50 ${
                activeConversation === conversation.id ? "bg-accent" : ""
              }`}
            >
              <button
                onClick={() => onSelectConversation(conversation.id)}
                className="w-full text-left flex flex-col space-y-1"
              >
                <span className="font-medium truncate">{conversation.title}</span>
                <span className="text-sm text-muted-foreground truncate">
                  {conversation.lastMessage}
                </span>
                <span className="text-xs text-muted-foreground">
                  {conversation.timestamp}
                </span>
              </button>
              
              {/* 删除按钮 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conversation.id);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
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
      
      {/* 拖动条 */}
      <div
        className="w-1 cursor-col-resize hover:bg-accent/50 active:bg-accent"
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
