import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
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
  Bell,
  User,
  Activity,
  ArrowUpRight,
  Utensils
} from "lucide-react";

const API_BASE = "http://localhost:8000";

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [uploading, setUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [autoMode, setAutoMode] = useState(true);
  const [detectionCount, setDetectionCount] = useState(0);
  const [cooldown, setCooldown] = useState(false);

  // 获取实时检测统计 (轮询)
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

  useEffect(() => {
    if (activeTab === "analytics") {
      fetchStats();
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
      
      // 如果触发了识别，进入冷却期
      setCooldown(true);
      setTimeout(() => setCooldown(false), 8000);
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

  const SidebarItem: React.FC<{ id: string; icon: any; label: string }> = ({ id, icon: Icon, label }) => (
    <div 
      className={`sidebar-item ${activeTab === id ? 'active' : ''}`}
      onClick={() => setActiveTab(id)}
    >
      <Icon size={18} strokeWidth={2.5} />
      <span>{label}</span>
    </div>
  );

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

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* 顶部导航 / 页眉 */}
        <header className="h-14 flex items-center justify-between px-8 border-b bg-background z-20">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="搜索分析内容..." 
                className="h-9 w-64 rounded-md border border-input bg-transparent pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Bell size={18} />
            </Button>
            
            {/* 自动检测状态指示器 */}
            {autoMode && (
              <div className="flex items-center gap-2 px-3 py-1 bg-neutral-100 rounded-full border border-border/50">
                <div className={`h-2 w-2 rounded-full ${detectionCount >= 3 ? 'bg-amber-500 animate-pulse' : 'bg-neutral-300'}`} />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {detectionCount >= 3 ? `检测到 ${detectionCount} 个项目 (正在就绪...)` : `待机中: ${detectionCount}/3`}
                </span>
              </div>
            )}

            <Button 
              variant="outline" 
              size="sm" 
              className={`h-9 px-3 text-xs font-semibold gap-2 border-dashed ${autoMode ? 'border-primary text-primary bg-primary/5' : ''}`}
              onClick={() => setAutoMode(!autoMode)}
            >
              <Activity size={14} />
              自动模式: {autoMode ? "开启" : "暂停"}
            </Button>

            <div className="h-4 w-px bg-border mx-1" />
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
                <CardContent>
                  <div className="text-2xl font-bold font-heading">1,284</div>
                  <p className="text-xs text-muted-foreground font-medium mt-1">
                    <span className="text-emerald-500 font-bold">+20.1%</span> 较上月
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-none border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-tight">平均浪费率</CardTitle>
                  <ArrowUpRight size={16} className="text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-heading">14.2%</div>
                  <p className="text-xs text-muted-foreground font-medium mt-1">
                    <span className="text-emerald-500 font-bold">-4.5%</span> 受控下降
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-none border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-tight">识别准确率</CardTitle>
                  <Utensils size={16} className="text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-heading">98.7%</div>
                  <p className="text-xs text-muted-foreground font-medium mt-1">
                    <span className="text-neutral-400 font-bold">稳定</span> 模型表现良好
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-none border-border bg-primary text-primary-foreground">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-primary-foreground/70 uppercase tracking-tight">活动监测节点</CardTitle>
                  <Activity size={16} className="text-primary-foreground/70" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-heading">12 节点</div>
                  <p className="text-xs text-primary-foreground/50 font-medium mt-1">
                    实时监控采集激活中
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 复合视图 - 识别影像 + 实时记录 */}
            {activeTab === "overview" && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 animate-in fade-in duration-1000 slide-in-from-bottom-2">
                {/* 识别影像卡片 (大) */}
                <Card className="lg:col-span-4 shadow-none border-border overflow-hidden flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg">实时识别影像流</CardTitle>
                    <CardDescription>AI 模型正在实时推理展示最新的餐盘分析结果。</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 p-0 pb-6 px-6">
                    <div className="relative aspect-video bg-neutral-900 rounded-lg overflow-hidden border group shadow-inner">
                      {/* 优先显示实时视频流 */}
                      <img 
                        src={`${API_BASE}/api/video_feed`} 
                        alt="实时视频流" 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/1280x720/000000/FFFFFF?text=Waiting+for+Camera+Stream...';
                        }}
                      />
                      
                      {/* 分析结果浮窗 */}
                      {analysisResult && (
                        <div className="absolute top-4 left-4 bg-primary/90 text-primary-foreground px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm border border-white/10 z-10">
                          最近分析置信度: 0.94
                        </div>
                      )}
                      
                      <div className="absolute bottom-4 right-4 flex h-3 w-3 z-10">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </div>
                      
                      {/* 如果有分析结果图，可以选择覆盖或者单独显示。这里我们保持视频流为主。 */}
                    </div>
                  </CardContent>
                </Card>

                {/* 实时分析明细 (类似 Recent Sales) */}
                <Card className="lg:col-span-3 shadow-none border-border flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg">实时采集明细</CardTitle>
                    <CardDescription>
                      当前帧中识别到的最新 {analysisResult?.analysis?.length || 0} 个项目。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ScrollArea className="h-[350px] pr-4">
                      {!analysisResult ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30 py-10">
                          <History size={48} strokeWidth={1} />
                          <p className="text-xs mt-4 font-medium uppercase tracking-widest">暂无记录</p>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          {analysisResult.analysis.map((item: any, idx: number) => (
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

            {/* 统计分析标签页 - 列表风格 */}
            {activeTab === "analytics" && (
              <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <Card className="shadow-none border-border">
                  <CardHeader>
                    <CardTitle className="text-xl">菜品偏好分析排行</CardTitle>
                    <CardDescription>根据过去 30 天的历史采集记录生成的排名。</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full overflow-hidden rounded-md border">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">排名</th>
                            <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">菜品分类</th>
                            <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">采集样本</th>
                            <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">受欢迎度</th>
                            <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">推荐状态</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {stats.map((item, idx) => (
                            <tr key={idx} className="hover:bg-muted/50 transition-colors group">
                              <td className="px-6 py-4 font-bold text-sm">#{idx + 1}</td>
                              <td className="px-6 py-4">
                                <span className="font-semibold text-sm">{item.food_name}</span>
                              </td>
                              <td className="px-6 py-4 text-sm text-muted-foreground">{item.sample_count}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-24 bg-neutral-100 h-1 rounded-full overflow-hidden">
                                     <div className="h-full bg-primary" style={{ width: `${item.popularity_score}%` }} />
                                  </div>
                                  <span className="text-xs font-black">{item.popularity_score}%</span>
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

                <div className="grid md:grid-cols-2 gap-6">
                   <Card className="shadow-none border-border">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle size={18} className="text-amber-500" />
                        运营决策建议
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-amber-50/50 border border-amber-100">
                          <p className="text-xs font-bold text-amber-900 mb-1 leading-none uppercase tracking-widest">警告：检测到过度浪费</p>
                          <p className="text-sm text-amber-800 mt-2">
                             <b>藕合</b> 的浪费率在本周增加了 12%。建议检查其调味配方或烹饪成熟度。
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div className="flex flex-col items-center justify-center py-32 opacity-25">
                 <History size={64} strokeWidth={1} />
                 <p className="text-sm font-bold uppercase tracking-widest mt-6">历史数据管理系统即将上线</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default Dashboard;
