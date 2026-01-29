import React, { useRef, useEffect } from "react";
import { Brain, User, Loader2, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIChatPanelProps {
  chatMessages: Message[];
  loadingAI: boolean;
  typingContent: string;
  userInput: string;
  setUserInput: (input: string) => void;
  handleSendMessage: (text: string) => void;
  handleExport: () => void;
  exporting: boolean;
}

const AIChatPanel: React.FC<AIChatPanelProps> = ({
  chatMessages,
  loadingAI,
  typingContent,
  userInput,
  setUserInput,
  handleSendMessage,
  handleExport,
  exporting
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, loadingAI, typingContent]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Card className="shadow-none border-border overflow-hidden h-[600px] flex flex-col bg-white">
        <div className="h-12 border-b px-6 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-2">
             <Brain size={16} className="text-primary" />
             <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">AI 经营专家在线</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs gap-2"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            {exporting ? "生成中..." : "下载分析报告"}
          </Button>
        </div>
        
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-white border text-primary shadow-sm"
                  }`}>
                    {msg.role === "user" ? <User size={14} /> : <Brain size={14} />}
                  </div>
                  <div className={`p-4 rounded-2xl shadow-sm border ${
                    msg.role === "user" 
                      ? "bg-neutral-100 text-neutral-900 rounded-tr-none border-neutral-200" 
                      : "bg-white text-neutral-800 rounded-tl-none border-neutral-100"
                  }`}>
                    <div className={`prose prose-sm max-w-none ai-report-content`}>
                      <ReactMarkdown 
                        components={{
                          h1: (props) => <h1 className="text-xl font-black mb-3 border-b pb-1" {...props} />,
                          h2: (props) => <h2 className="text-lg font-bold mt-4 mb-2" {...props} />,
                          h3: (props) => <h3 className="text-base font-bold mt-3 mb-1" {...props} />,
                          p: (props) => <p className="leading-relaxed mb-3 last:mb-0" {...props} />,
                          ul: (props) => <ul className="list-disc pl-4 space-y-1 mb-3" {...props} />,
                          li: (props) => <li className="font-medium" {...props} />,
                          strong: (props) => <strong className="font-bold underline decoration-primary/30 underline-offset-2" {...props} />,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {typingContent && (
              <div className="flex justify-start">
                <div className="max-w-[100%] rounded-2xl p-4 text-sm bg-muted/30 text-foreground border border-border/30 backdrop-blur-sm">
                  <ReactMarkdown>{typingContent}</ReactMarkdown>
                  <span className="inline-block w-1 h-4 bg-primary ml-1 animate-pulse" />
                </div>
              </div>
            )}
            
            {loadingAI && !typingContent && (
              <div className="flex justify-start">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border text-primary shadow-sm flex items-center justify-center">
                    <Loader2 size={14} className="animate-spin" />
                  </div>
                  <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-neutral-100 shadow-sm flex items-center gap-2">
                     <div className="flex gap-1">
                       <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                       <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                       <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                     </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t bg-neutral-50/50">
          <div className="relative flex gap-2">
            <textarea
              placeholder="询问 AI 关于分量调整、备餐建议或菜品反馈..."
              className="flex-1 min-h-[44px] max-h-32 p-3 pr-12 rounded-xl border border-input bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all resize-none"
              rows={1}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(userInput);
                }
              }}
            />
            <Button 
              className="absolute right-2 bottom-2 h-8 w-8 rounded-lg p-0" 
              onClick={() => handleSendMessage(userInput)}
              disabled={loadingAI || !userInput.trim()}
            >
              <Sparkles size={16} />
            </Button>
          </div>
          <p className="text-[10px] text-center text-muted-foreground mt-3">
            AI 经营建议基于实时数据生成，仅供参考
          </p>
        </div>
      </Card>
    </div>
  );
};

export default AIChatPanel;
