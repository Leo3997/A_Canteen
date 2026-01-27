import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Camera, 
  History, 
  BarChart3, 
  LayoutDashboard, 
  Settings, 
  ChevronRight,
  AlertTriangle,
  Search,
  User,
  Activity,
  ArrowUpRight,
  Utensils,
  Sparkles,
  Brain,
  Loader2,
  Send,
  RotateCcw
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import SettingsPanel from "./SettingsPanel";

const API_BASE = "http://localhost:8000";

const Dashboard: React.FC = () => {
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
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // 消息自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, loadingAI]);

  // 获取实时检测统计 (轮询)
  const fetchTrends = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/dashboard/trends`);
      const data = await resp.json();
      setTrends(data);
    } catch (err) {
      console.error("Failed to fetch trends:", err);
    }
  };

  useEffect(() => {
    let interval: any;
    if (activeTab === "overview") {
      interval = setInterval(async () => {
        try {
          const resp = await fetch(`${API_BASE}/api/detection_stats`);
          const data = await resp.json();
          setDetectionCount(data.count);
        } catch (err) {
          console.error("Failed to fetch detection stats:", err);
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/stats/taste`);
      const data = await resp.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const fetchDashboardSummary = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/dashboard/summary`);
      const data = await resp.json();
      setSummary(data);
    } catch (err) {
      console.error("Failed to fetch dashboard summary:", err);
    }
  };

  const fetchHistory = async (page = 1) => {
    try {
      const resp = await fetch(`${API_BASE}/api/records?page=${page}&limit=8`);
      const data = await resp.json();
      setHistoryRecords(data.data);
      setHistoryTotal(data.total);
      setHistoryPage(data.page);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  const fetchRecordDetails = async (recordId: number) => {
    try {
      const resp = await fetch(`${API_BASE}/api/records/${recordId}/details`);
      const data = await resp.json();
      setSelectedRecord(data);
      setIsDetailOpen(true);
    } catch (err) {
      console.error("Failed to fetch record details:", err);
    }
  };

  const handleDeleteRecord = async (recordId: number) => {
    if (!window.confirm("确定要永久删除这条记录及其图片吗？")) return;
    try {
      const resp = await fetch(`${API_BASE}/api/records/${recordId}`, { method: "DELETE" });
      if (resp.ok) {
        fetchHistory(historyPage);
        fetchDashboardSummary();
        fetchTrends();
      }
    } catch (err) {
      console.error("Failed to delete record:", err);
    }
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId === "ai" && chatMessages.length === 0) {
      setChatMessages([
        { role: "assistant", content: "您好！我是您的智慧食堂 AI 经营专家。我可以结合实时的剩菜数据、菜品走势为您提供经营建议。请问有什么可以帮您？" }
      ]);
    }
  };

  const handleSendMessage = async (text: string) => {
    const messageText = text || userInput;
    if (!messageText.trim() || loadingAI) return;

    const newMessages = [...chatMessages, { role: "user" as const, content: messageText }];
    setChatMessages(newMessages);
    setUserInput("");
    setLoadingAI(true);

    try {
      const resp = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: newMessages })
      });
      const data = await resp.json();
      setChatMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (err) {
      console.error("Failed to fetch AI response:", err);
      setChatMessages([...newMessages, { role: "assistant", content: "抱歉，我现在无法回答您的问题，请检查网络或稍后重试。" }]);
    } finally {
      setLoadingAI(false);
    }
  };

  useEffect(() => {
    if (activeTab === "overview") {
      // 使用 Promise.all 并行加载，提速显示
      Promise.all([fetchDashboardSummary(), fetchTrends()]);
    } else if (activeTab === "analytics") {
      fetchStats();
    } else if (activeTab === "history") {
      fetchHistory(1);
    }
  }, [activeTab]);

  const handleCapture = async () => {
    if (uploading || cooldown) return;
    setUploading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/capture`, {
        method: "POST",
      });
      const data = await resp.json();
      setAnalysisResult(data);
      
      // 如果触发了识别，进入短冷却期
      setCooldown(true);
      setTimeout(() => setCooldown(false), 3000);

      // 3秒后自动重置为实时流
      setTimeout(() => {
        setAnalysisResult(null);
      }, 3000);
    } catch (err) {
      console.error("Capture analysis failed:", err);
    } finally {
      setUploading(false);
    }
  };

  // 辅助稳定检测逻辑
  useEffect(() => {
    if (!autoMode || cooldown || uploading || activeTab !== "overview") {
      return;
    }

    if (detectionCount >= 3) {
      const timer = setTimeout(() => {
        handleCapture();
      }, 2000); // 稳定 2 秒触发
      return () => clearTimeout(timer);
    }
  }, [detectionCount, autoMode, cooldown, uploading, activeTab]);

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

  const handleClearStats = async () => {
    if (!window.confirm("确定要清空所有排行榜数据吗？\n此操作将移除现有所有统计记录，数据将从当前时刻开始重新计入。")) {
      return;
    }
    
    try {
      const resp = await fetch(`${API_BASE}/api/stats/clear`, { method: "POST" });
      if (resp.ok) {
        // 清空成功后刷新数据
        fetchStats();
        fetchDashboardSummary();
        fetchTrends();
        setAnalysisResult(null);
        alert("排行榜已成功重置！");
      }
    } catch (err) {
      console.error("Failed to clear stats:", err);
      alert("清理失败，请检查网络连接。");
    }
  };

  const SidebarItem: React.FC<{ id: string; icon: any; label: string }> = ({ id, icon: Icon, label }) => (
    <div 
      className={`sidebar-item ${activeTab === id ? 'active' : ''}`}
      onClick={() => setActiveTab(id)}
    >
      <Icon size={18} strokeWidth={2.5} />
      <span>{label}</span>
    </div>
  );

  const Sparkline: React.FC<{ data: number[], color?: string }> = ({ data, color }) => {
    if (!data || data.length < 2) return <div className="w-[100px] h-[30px] flex items-center justify-center text-[10px] text-muted-foreground/30">无趋势</div>;
    const max = Math.max(...data, 10);
    const min = Math.min(...data, 0);
    const range = (max - min) || 1;
    const width = 100;
    const height = 30;
    
    const points = data.map((v, i) => ({
      x: (i / (data.length - 1)) * width,
      y: height - ((v - min) / range) * height
    }));
    
    const pathData = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
    const strokeColor = color || "currentColor";
    const circleColor = color || "var(--primary)";
    
    return (
      <svg width={width} height={height} className="overflow-visible">
        <path
          d={pathData}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.3 }}
        />
        <circle cx={points[points.length-1].x} cy={points[points.length-1].y} r="2.5" fill={circleColor} />
      </svg>
    );
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden border-t">
      {/* Sidebar - Shadcn 精确风格 */}
      <aside className="w-56 flex flex-col h-full bg-background border-r">
        <div className="h-14 flex items-center px-6 border-b">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center text-primary-foreground">
              <Utensils size={14} />
            </div>
            智慧餐厅系统
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1">
          <SidebarItem id="overview" icon={LayoutDashboard} label="控制台总览" />
          <SidebarItem id="analytics" icon={BarChart3} label="统计分析" />
          <SidebarItem id="history" icon={History} label="历史记录" />
          <div 
            className={`sidebar-item group relative overflow-hidden ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => handleTabChange("ai")}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Sparkles size={18} className={`${activeTab === 'ai' ? 'text-primary' : 'text-amber-500'}`} strokeWidth={2.5} />
            <span className="flex-1">AI 智能专家</span>
            <div className="bg-amber-100 text-amber-600 text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">Pro</div>
          </div>
          <SidebarItem id="settings" icon={Settings} label="系统设置" />
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <User size={16} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold truncate leading-none">管理员</p>
              <p className="text-[10px] text-muted-foreground truncate mt-1">admin@canteen.ai</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-8 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-4">
             <div className="relative group">
               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
               <input 
                 type="text" 
                 placeholder="搜索菜品名称或记录..." 
                 className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
               />
             </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 mr-4 pr-4 border-r">
                <div className={`w-2 h-2 rounded-full ${autoMode ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-300'}`} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                   自动检测模式: {autoMode ? '开启' : '关闭'}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`h-6 w-10 p-0 rounded-full transition-colors ${autoMode ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-muted'}`}
                  onClick={() => setAutoMode(!autoMode)}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${autoMode ? 'translate-x-2' : '-translate-x-2'}`} />
                </Button>
             </div>
            <Button 
              className="btn-primary h-9 px-4 text-xs font-semibold gap-2"
              onClick={handleCapture}
              disabled={uploading || cooldown}
            >
              <Camera size={14} />
              {uploading ? "正在分析..." : cooldown ? "冷却中..." : "触发识别采集"}
            </Button>
            <div className="relative">
              <label className="btn-secondary h-9 px-4 text-xs font-semibold flex items-center cursor-pointer border hover:bg-muted/50 transition-colors rounded-md">
                上传本地图片
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
              </label>
            </div>
          </div>
        </header>

        {/* 内容容器 */}
        <ScrollArea className="flex-1 p-8 bg-neutral-50/30">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold tracking-tight">控制台总览</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs">下载分析报告</Button>
              </div>
            </div>

            {/* 顶部数据摘要 - Shadcn 4 Cards 风格 */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in duration-700 slide-in-from-top-2">
              <Card className="shadow-none border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-tight">累计记录数</CardTitle>
                  <Activity size={16} className="text-muted-foreground" />
                </CardHeader>
                <CardContent className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-bold font-heading">{summary.total_records.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                      <span className="text-emerald-500 font-bold">+{summary.growth_rate}%</span> 较上月
                    </p>
                  </div>
                  <div className="pb-1">
                    <Sparkline data={trends.records} color="#10b981" />
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-none border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-tight">平均浪费率</CardTitle>
                  <ArrowUpRight size={16} className={`text-muted-foreground ${summary.avg_waste_rate > 20 ? 'text-red-500' : 'text-emerald-500'}`} />
                </CardHeader>
                <CardContent className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-bold font-heading">{summary.avg_waste_rate}%</div>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                      <span className={summary.avg_waste_rate < 20 ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>
                        {summary.avg_waste_rate < 20 ? "表现优异" : "需关注"}
                      </span>
                    </p>
                  </div>
                  <div className="pb-1">
                    <Sparkline data={trends.waste} color={summary.avg_waste_rate > 20 ? "#f59e0b" : "#10b981"} />
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-none border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-tight">识别准确率</CardTitle>
                  <Utensils size={16} className="text-muted-foreground" />
                </CardHeader>
                <CardContent className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-bold font-heading">
                      {summary.accuracy > 0 ? `${summary.accuracy}%` : "计算中..."}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                      <span className="text-primary font-bold">
                        {summary.accuracy > 90 ? "极高" : "稳定"}
                      </span> 模型状态良好
                    </p>
                  </div>
                  <div className="pb-1">
                    <Sparkline data={trends.accuracy} color="#3b82f6" />
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-none border-border bg-primary text-primary-foreground">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-primary-foreground/70 uppercase tracking-tight">活动监测节点</CardTitle>
                  <Activity size={16} className="text-primary-foreground/70" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-heading">{summary.active_nodes} 节点</div>
                  <p className="text-xs text-primary-foreground/50 font-medium mt-1">
                    实时监控采集激活中
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 复合视图 - 识别影像 + 实时记录 */}
            {activeTab === "overview" && (
              <div className="grid lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-1000">
                <Card className="lg:col-span-2 shadow-2xl border-border bg-neutral-900 overflow-hidden relative group min-h-[480px]">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 opacity-60" />
                  <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                     <div className="px-2 py-1 rounded bg-emerald-500 text-[10px] font-bold text-white uppercase tracking-widest animate-pulse">Live Feed</div>
                     <div className="px-2 py-1 rounded bg-black/40 backdrop-blur-md text-[10px] font-bold text-white/80 border border-white/10 uppercase tracking-widest">Node #01 - Cafeteria</div>
                  </div>
                  <img 
                    src={analysisResult ? `${API_BASE}/static/results/${analysisResult.image_path}` : `${API_BASE}/api/video_feed`}
                    alt="Vision Analysis" 
                    className="w-full h-full object-cover"
                  />
                  {cooldown && !uploading && !analysisResult && (
                     <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                        <div className="bg-white/90 p-4 rounded-xl shadow-2xl flex flex-col items-center">
                           <div className="w-12 h-1 text-neutral-100 bg-neutral-100 rounded-full overflow-hidden relative">
                              <div className="absolute inset-0 bg-primary animate-width-full" style={{ animationDuration: '3s' }} />
                           </div>
                           <span className="text-[10px] font-black uppercase tracking-widest mt-2 text-primary">冷却中... 准备下一次采集</span>
                        </div>
                     </div>
                  )}
                  <div className="absolute bottom-6 left-8 right-8 z-20 flex items-end justify-between text-white">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white/60 uppercase tracking-widest">当前分析结果</p>
                      <h3 className="text-4xl font-black font-heading">
                        {analysisResult ? `${analysisResult.total_waste_rate}%` : "等待数据..."}
                      </h3>
                      <p className="text-sm font-medium text-white/80 flex items-center gap-2">
                        {analysisResult ? "实时浪费率监测已完成" : "正在实时监测用餐区域..."}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="shadow-none border-border h-full flex flex-col">
                  <CardHeader className="h-14 flex flex-row items-center justify-between border-b px-6 py-0">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest">实时分格分析</CardTitle>
                    <Utensils size={14} className="text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="flex-1 p-0 flex flex-col">
                    <ScrollArea className="flex-1 p-6">
                      {!analysisResult ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50 py-12">
                          <div className="w-12 h-12 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center">
                             <Activity size={20} className="text-primary/30" />
                          </div>
                          <p className="text-xs font-bold uppercase tracking-widest max-w-[160px]">暂无采集结果 正在等待稳定帧触发...</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {analysisResult.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center">
                              <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center text-primary font-bold text-xs mr-4 border">
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-bold leading-none">{item.category}</p>
                                <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter">分格 ID: {item.original_grid}</p>
                              </div>
                              <div className="ml-auto flex flex-col items-end">
                                <span className={`text-sm font-black ${
                                  item.waste_rate > 50 ? 'text-red-500' : 
                                  item.waste_rate > 20 ? 'text-amber-500' : 'text-primary'
                                }`}>
                                  {item.waste_rate}%
                                </span>
                                <span className="text-[10px] text-muted-foreground font-bold uppercase">剩余量</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                    <Button variant="ghost" className="w-full mt-6 text-xs h-10 border border-border/50" onClick={() => setActiveTab("analytics")}>
                      查看详细分析数据 <ChevronRight size={14} className="ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* AI 智能决策中心视图 */}
            {activeTab === "ai" && (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <Card className="shadow-none border-border overflow-hidden h-[600px] flex flex-col bg-white">
                  <div className="h-12 border-b px-6 flex items-center justify-between bg-neutral-50/50">
                    <div className="flex items-center gap-2">
                       <Brain size={16} className="text-primary" />
                       <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">AI 经营专家在线</span>
                    </div>
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
                              <div className={`prose prose-sm max-w-none ${msg.role === "user" ? "" : ""} ai-report-content`}>
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

                      {loadingAI && (
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
                            handleSendMessage("");
                          }
                        }}
                      />
                      <Button 
                        size="icon" 
                        className="h-10 w-10 rounded-xl shadow-sm"
                        disabled={!userInput.trim() || loadingAI}
                        onClick={() => handleSendMessage("")}
                      >
                        <Send size={16} />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between mt-2 px-1">
                      <p className="text-[10px] text-muted-foreground">按 Enter 发送 / 清空历史请点击右侧</p>
                      <button 
                        className="text-[10px] font-bold text-neutral-400 hover:text-red-500 transition-colors"
                        onClick={() => { if(window.confirm("确定清空对话历史吗？")) setChatMessages([]); }}
                      >
                        <RotateCcw size={10} className="inline mr-1" />
                        重置对话
                      </button>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* 统计分析标签页 - 列表风格 */}
            {activeTab === "analytics" && (
              <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold tracking-tight">菜品偏好分析排行</h3>
                    <p className="text-sm text-muted-foreground">根据历史采集记录生成的实时排名。</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100"
                    onClick={handleClearStats}
                  >
                    <AlertTriangle size={14} className="mr-1" />
                    重置排行数据
                  </Button>
                </div>

                <Card className="shadow-none border-border">
                  <CardContent className="p-0">
                    <div className="w-full overflow-hidden rounded-md border-0">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider w-16">排名</th>
                            <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">菜品分类</th>
                            <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider w-32">采集样本</th>
                            <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider w-48">受欢迎度</th>
                            <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider w-32">推荐状态</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {stats.map((item, idx) => (
                            <tr key={idx} className="hover:bg-muted/50 transition-colors group">
                              <td className="px-6 py-4 font-bold text-sm text-center md:text-left">#{idx + 1}</td>
                              <td className="px-6 py-4">
                                <span className="font-semibold text-sm">{item.food_name}</span>
                              </td>
                              <td className="px-6 py-4 text-sm text-muted-foreground">{item.sample_count}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 max-w-[120px] bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                                     <div className="h-full bg-primary" style={{ width: `${item.popularity_score}%` }} />
                                  </div>
                                  <span className="text-xs font-black min-w-[32px]">{Math.round(item.popularity_score)}%</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {idx < 3 ? (
                                  <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-tight">高度推荐</span>
                                ) : (
                                  <span className="px-2 py-1 rounded bg-neutral-100 text-neutral-500 text-[10px] font-bold uppercase tracking-tight">常规供应</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

              </div>
            )}

            {activeTab === "history" && (
              <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-10">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold tracking-tight">历史识别记录</h3>
                    <p className="text-sm text-muted-foreground">共计 {historyTotal} 条记录，支持查看详情及物理删除。</p>
                  </div>
                </div>

                <div className="rounded-md border bg-card">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase w-48">识别采集时间</th>
                        <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase w-32">快照预览</th>
                        <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase w-32">总浪费率</th>
                        <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase w-32">识别置信度</th>
                        <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {historyRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium">
                            {new Date(record.timestamp).toLocaleString('zh-CN', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <div className="w-16 h-10 rounded overflow-hidden border bg-neutral-100 cursor-zoom-in group relative" onClick={() => fetchRecordDetails(record.id)}>
                               <img 
                                 src={`${API_BASE}/static/results/${record.image_path}`} 
                                 alt="Record" 
                                 className="w-full h-full object-cover transition-transform group-hover:scale-110"
                               />
                               <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[8px] text-white font-bold uppercase">预览</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                             <span className={`text-sm font-bold ${record.total_waste_rate > 30 ? 'text-red-500' : 'text-emerald-500'}`}>
                               {record.total_waste_rate}%
                             </span>
                          </td>
                          <td className="px-6 py-4">
                             <span className="text-sm text-muted-foreground font-medium">{record.confidence}%</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" className="h-8 text-xs font-bold" onClick={() => fetchRecordDetails(record.id)}>详情</Button>
                              <Button variant="ghost" size="sm" className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteRecord(record.id)}>删除</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {historyRecords.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-20 text-center text-muted-foreground text-sm">暂无识别记录</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 分页控制器 */}
                {historyTotal > 8 && (
                   <div className="flex items-center justify-center gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={historyPage === 1}
                        onClick={() => fetchHistory(historyPage - 1)}
                      >上一页</Button>
                      <span className="text-xs font-bold mx-4 text-muted-foreground">第 {historyPage} 页 / 共 {Math.ceil(historyTotal / 8)} 页</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={historyPage >= Math.ceil(historyTotal / 8)}
                        onClick={() => fetchHistory(historyPage + 1)}
                      >下一页</Button>
                   </div>
                )}
              </div>
            )}

            {/* 系统设置视图 */}
            {activeTab === "settings" && <SettingsPanel />}
          </div>
        </ScrollArea>

      </div>

      {/* 全局详情弹窗 */}
      {isDetailOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border shadow-2xl rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                  <h4 className="text-lg font-bold">识别详情追溯</h4>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-bold">ID: {selectedRecord.id} • {new Date(selectedRecord.timestamp).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant={showHeatmap ? "default" : "outline"} 
                  size="sm" 
                  className="h-8 text-[10px] font-bold uppercase tracking-widest"
                  onClick={() => setShowHeatmap(!showHeatmap)}
                >
                  {showHeatmap ? "查看原图" : "查看复杂度热力图"}
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => { setIsDetailOpen(false); setShowHeatmap(false); }}>×</Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6 grid md:grid-cols-2 gap-8">
              {/* 左侧大图 */}
              <div className="space-y-4">
                  <div className="rounded-lg border bg-neutral-100 overflow-hidden shadow-inner relative group">
                    <img 
                      src={showHeatmap && selectedRecord.heatmap_path ? `${API_BASE}/static/results/${selectedRecord.heatmap_path}` : `${API_BASE}/static/results/${selectedRecord.image_path}`} 
                      alt="Detail" 
                      className="w-full h-auto block transition-all"
                    />
                    {showHeatmap && !selectedRecord.heatmap_path && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs font-bold uppercase tracking-widest">
                        该记录无热力图数据
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[8px] font-bold text-white uppercase tracking-widest">
                      {showHeatmap ? "Complexity Heatmap" : "Original Scan"}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">主图路径</span>
                      <span className="font-mono text-[10px]">{selectedRecord.image_path}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">总浪费率计算值</span>
                      <span className="font-bold text-primary">{selectedRecord.total_waste_rate}%</span>
                    </div>
                  </div>
              </div>

              {/* 右侧菜品 Breakdown */}
              <div className="space-y-6">
                  <h5 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-l-2 border-primary pl-2">菜品识别清单 (Breakdown)</h5>
                  <div className="space-y-3">
                    {selectedRecord.details.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border/50">
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                              {idx + 1}
                            </div>
                            <span className="text-sm font-bold">{item.food_name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">格 ID: {item.original_grid}</span>
                            <span className={`text-sm font-black ${item.waste_rate > 30 ? 'text-red-500' : 'text-emerald-500'}`}>
                              {item.waste_rate}%
                            </span>
                          </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 pt-6 border-t">
                    <Button className="w-full h-12 text-sm font-bold" onClick={() => setIsDetailOpen(false)}>关闭详情预览</Button>
                  </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
