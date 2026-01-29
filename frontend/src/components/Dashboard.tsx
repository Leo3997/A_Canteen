import React, { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BlurReveal } from "@/components/ui/animated-components";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";

// Layout Components
import Sidebar from "./layout/Sidebar";
import Header from "./layout/Header";

// Sub-components
import StatsOverview from "./stats/StatsOverview";
import LiveFeed from "./dashboard/LiveFeed";
import AIChatPanel from "./dashboard/AIChatPanel";
import SettingsPanel from "./SettingsPanel";
import AnalyticsView from "./dashboard/AnalyticsView";
import HistoryView from "./dashboard/HistoryView";
import RecordDetailModal from "./dashboard/RecordDetailModal";

const API_BASE = "http://localhost:8000";

const Dashboard: React.FC = () => {
  // --- State Management ---
  const [activeTab, setActiveTab] = useState("overview");
  const [uploading, setUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [autoMode, setAutoMode] = useState(true);
  const [detectionCount, setDetectionCount] = useState(0);
  const [cooldown, setCooldown] = useState(false);
  const [summary, setSummary] = useState({
    total_records: 0,
    growth_rate: 0,
    avg_waste_rate: 0,
    accuracy: 0,
    active_nodes: 0
  });
  const [trends, setTrends] = useState<{ waste: number[]; records: number[]; accuracy: number[] }>({ 
    waste: [], 
    records: [], 
    accuracy: [] 
  });
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  
  // AI Chat State
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [typingContent, setTypingContent] = useState("");
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // --- Theme ---
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // --- Data Fetching Operations ---
  const fetchDashboardSummary = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/dashboard/summary`);
      const data = await resp.json();
      setSummary(data);
    } catch (err) {
      console.error("Failed to fetch dashboard summary:", err);
    }
  };

  const fetchTrends = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/dashboard/trends`);
      const data = await resp.json();
      setTrends(data);
    } catch (err) {
      console.error("Failed to fetch trends:", err);
    }
  };

  const fetchStats = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/stats/taste`);
      const data = await resp.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const fetchHistory = async (page = 1, search = searchQuery) => {
    try {
      const url = new URL(`${API_BASE}/api/records`);
      url.searchParams.append("page", page.toString());
      url.searchParams.append("limit", "8");
      if (search) url.searchParams.append("search", search);
      
      const resp = await fetch(url.toString());
      const data = await resp.json();
      setHistoryRecords(data.data);
      setHistoryTotal(data.total);
      setHistoryPage(data.page);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  const handleHistoryPageChange = (newPage: number) => {
    fetchHistory(newPage);
  };

  const handleDeleteRecord = async (recordId: number) => {
    if (!window.confirm("确定要删除这条记录吗？")) return;
    try {
      await fetch(`${API_BASE}/api/records/${recordId}`, { method: "DELETE" });
      fetchHistory(historyPage);
      fetchDashboardSummary(); // Refresh summary
    } catch (err) {
      console.error("Failed to delete record:", err);
    }
  };

  const handleViewDetail = async (recordId: number) => {
    setLoadingDetail(true);
    try {
      const resp = await fetch(`${API_BASE}/api/records/${recordId}/details`);
      if (resp.ok) {
        const data = await resp.json();
        setSelectedRecord(data);
      } else {
        alert("获取详情失败");
      }
    } catch (err) {
      console.error("Failed to fetch detail:", err);
      alert("网络错误，请稍后重试");
    } finally {
      setLoadingDetail(false);
    }
  };

  // --- WebSocket Integration ---
  // Replace polling with WS
  useWebSocket("/ws/status", (msg: any) => {
    if (msg.type === "detection_update") {
      setDetectionCount(msg.data.count);
    }
  });

  // --- Initialization ---
  useEffect(() => {
    const init = async () => {
      setIsInitialLoading(true);
      if (activeTab === "overview") {
        await Promise.all([fetchDashboardSummary(), fetchTrends()]);
      } else if (activeTab === "analytics") {
        await fetchStats();
      } else if (activeTab === "history") {
        await fetchHistory(1);
      }
      setIsInitialLoading(false);
    };
    init();
  }, [activeTab]);

  // Handle Search for History
  useEffect(() => {
    if (activeTab === "history") {
        const timer = setTimeout(() => {
            fetchHistory(1, searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  // --- Handlers ---
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId === "ai" && chatMessages.length === 0) {
      setChatMessages([
        { role: "assistant", content: "您好！我是您的智慧食堂 AI 经营专家。我可以结合实时的剩菜数据、菜品走势为您提供经营建议。请问有什么可以帮您？" }
      ]);
    }
  };

  const handleCapture = async () => {
    if (uploading || cooldown) return;
    setUploading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/capture`, { method: "POST" });
      const data = await resp.json();
      setAnalysisResult(data);
      
      setCooldown(true);
      setTimeout(() => setCooldown(false), 3000);
      setTimeout(() => setAnalysisResult(null), 3000);
    } catch (err) {
      console.error("Capture analysis failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const resp = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await resp.json();
      setAnalysisResult(data);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports/export`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        const url = `${API_BASE}${data.url}`;
        const link = document.createElement('a');
        link.href = url;
        link.download = data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert("导出失败");
      }
    } catch (e) {
      console.error(e);
      alert("导出出错");
    } finally {
      setExporting(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    const messageText = text || userInput;
    if (!messageText.trim() || loadingAI) return;

    const userMsg = { role: "user" as const, content: messageText };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setUserInput("");
    setLoadingAI(true);
    setTypingContent("");

    try {
      const resp = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: newMessages })
      });
      const data = await resp.json();
      
      let currentText = "";
      const fullText = data.reply;
      const interval = setInterval(() => {
        if (currentText.length < fullText.length) {
          currentText += fullText[currentText.length];
          setTypingContent(currentText);
        } else {
          clearInterval(interval);
          setChatMessages(prev => [...prev, { role: "assistant", content: fullText }]);
          setTypingContent("");
        }
      }, 20);

    } catch (err) {
      console.error("Failed to fetch AI response:", err);
      setChatMessages(prev => [...prev, { role: "assistant", content: "抱歉，我现在无法回答您的问题，请检查网络或稍后重试。" }]);
    } finally {
      setLoadingAI(false);
    }
  };

  // --- Auto-trigger logic ---
  useEffect(() => {
    if (!autoMode || cooldown || uploading || activeTab !== "overview") return;

    if (detectionCount >= 3) {
      const timer = setTimeout(() => handleCapture(), 2000);
      return () => clearTimeout(timer);
    }
  }, [detectionCount, autoMode, cooldown, uploading, activeTab]);

  return (
    <div className={`flex h-screen bg-background text-foreground overflow-hidden border-t ${isDarkMode ? "dark" : ""}`}>
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
        {/* Header */}
        <Header 
           searchQuery={searchQuery}
           setSearchQuery={setSearchQuery}
           isDarkMode={isDarkMode}
           setIsDarkMode={setIsDarkMode}
           autoMode={autoMode}
           setAutoMode={setAutoMode}
           handleCapture={handleCapture}
           handleFileUpload={handleFileUpload}
           uploading={uploading}
           cooldown={cooldown}
        />

        {/* Scrollable Content Area */}
        <ScrollArea className="flex-1 p-8 bg-muted/20">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Page Title */}
            <div className="flex items-center justify-between">
              <BlurReveal>
                <h2 className="text-3xl font-bold tracking-tight">
                  {activeTab === 'overview' && "控制台总览"}
                  {activeTab === 'analytics' && "统计分析"}
                  {activeTab === 'history' && "历史记录"}
                  {activeTab === 'ai' && "AI 智能专家"}
                  {activeTab === 'settings' && "系统设置"}
                </h2>
              </BlurReveal>
              {['overview', 'analytics', 'history', 'ai'].includes(activeTab) && (
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
              )}
            </div>

            {/* Content Based on Tab */}
            
            {activeTab === "overview" && (
              <>
                <StatsOverview 
                  summary={summary} 
                  trends={trends} 
                  isInitialLoading={isInitialLoading} 
                />
                <LiveFeed 
                  analysisResult={analysisResult} 
                  uploading={uploading} 
                  cooldown={cooldown} 
                  setActiveTab={setActiveTab}
                />
              </>
            )}

            {activeTab === "ai" && (
              <AIChatPanel 
                chatMessages={chatMessages}
                loadingAI={loadingAI}
                typingContent={typingContent}
                userInput={userInput}
                setUserInput={setUserInput}
                handleSendMessage={handleSendMessage}
                handleExport={handleExport}
                exporting={exporting}
              />
            )}

            {activeTab === "settings" && (
                <SettingsPanel />
            )}
            
            {activeTab === "analytics" && (
                <AnalyticsView stats={stats} />
            )}

            {activeTab === "history" && (
                <HistoryView 
                  records={historyRecords}
                  total={historyTotal}
                  page={historyPage}
                  setPage={handleHistoryPageChange}
                  onViewDetail={handleViewDetail}
                  onDelete={handleDeleteRecord}
                />
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Record details modal */}
      {selectedRecord && (
        <RecordDetailModal 
          record={selectedRecord} 
          onClose={() => setSelectedRecord(null)} 
        />
      )}

      {loadingDetail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
           <div className="bg-white p-4 rounded-xl shadow-2xl flex items-center gap-3">
              <Loader2 className="animate-spin text-primary" size={20} />
              <span className="text-sm font-medium">加载深度分析数据...</span>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
