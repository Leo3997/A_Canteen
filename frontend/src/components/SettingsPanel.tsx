
import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Eye, 
  Brain, 
  Cpu, 
  Database,
  Trash2,
  Download,
  Loader2,
  Check,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Button,
  Input,
  Textarea,
  Label,
  Switch,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/shadcn-ui-components";

const API_BASE = "http://localhost:8000";

const SettingsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState("recognition");
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [config, setConfig] = useState<any>({
    recognition: {
      confidence_threshold: 0.45,
      enable_sam: true,
      auto_perspective: true,
      gamma_correction: 1.0
    },
    ai: {
      api_key: "",
      model: "qwen-turbo",
      system_prompt: ""
    },
    system: {
      camera_index: 0,
      cooldown_seconds: 3,
      auto_mode: true
    }
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/config`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (error) {
      console.error("Failed to load config:", error);
    }
  };

  const handleSave = async () => {
    setSaveStatus("loading");
    try {
      const res = await fetch(`${API_BASE}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    } catch (error) {
      console.error("Failed to save config:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  };

  const updateConfig = (section: string, key: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleClearData = async () => {
    if (!window.confirm("危险操作：确定要清空所有历史数据吗？此操作不可恢复！")) return;
    try {
      const res = await fetch(`${API_BASE}/api/stats/clear`, { method: "POST" });
      if (res.ok) alert("数据清理完成");
    } catch (e) {
      alert("清理失败");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">系统设置</h2>
          <p className="text-muted-foreground mt-1">管理识别参数、AI 模型与系统选项</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saveStatus === "loading"} 
          className={`gap-2 min-w-[120px] transition-all duration-300 ${
            saveStatus === "success" ? "bg-green-600 hover:bg-green-700" : 
            saveStatus === "error" ? "bg-destructive hover:bg-destructive/90" : ""
          }`}
        >
          {saveStatus === "loading" ? (
            <>
              <Loader2 size={16} className="animate-spin" /> 保存中...
            </>
          ) : saveStatus === "success" ? (
            <>
              <Check size={16} /> 已保存
            </>
          ) : saveStatus === "error" ? (
            <>
              <XCircle size={16} /> 失败
            </>
          ) : (
            <>
              <Save size={16} /> 保存更改
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1">
          <TabsTrigger value="recognition" className="gap-2">
            <Eye size={16} /> 识别算法
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Brain size={16} /> AI 模型
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Cpu size={16} /> 系统硬件
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <Database size={16} /> 数据维护
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="recognition" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>视觉算法参数</CardTitle>
                <CardDescription>调整图像识别的核心逻辑以适应当前环境。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>启用 SAM 高精度分割 (Segment Anything)</Label>
                    <Switch 
                      checked={config.recognition.enable_sam}
                      onCheckedChange={(c) => updateConfig("recognition", "enable_sam", c)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">如果关闭，将仅使用 YOLO 进行检测，速度更快精读稍低。</p>
                </div>
                
                <div className="space-y-4 pt-4 border-t">
                  <Label>置信度阈值 (Confidence)</Label>
                  <Input 
                    type="number" 
                    step="0.05" 
                    min="0" 
                    max="1"
                    value={config.recognition.confidence_threshold}
                    onChange={(e) => updateConfig("recognition", "confidence_threshold", parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">较低的值会检出更多物体但可能误报，较高的值更精准但可能漏检。</p>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <Label>反光抑制 (Gamma Correction)</Label>
                  <Input 
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5.0"
                    value={config.recognition.gamma_correction} 
                    onChange={(e) => updateConfig("recognition", "gamma_correction", parseFloat(e.target.value))} 
                  />
                  <p className="text-xs text-muted-foreground">调低此值 (&lt; 1.0) 可压暗不锈钢高光区域。</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
             <Card>
              <CardHeader>
                <CardTitle>大语言模型配置</CardTitle>
                <CardDescription>管理智能助手的行为与接口参数。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                   <Label>模型版本</Label>
                   <Select 
                     value={config.ai.model} 
                     onValueChange={(v) => updateConfig("ai", "model", v)}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="选择模型" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="qwen-turbo">Qwen-Turbo (快速/经济)</SelectItem>
                       <SelectItem value="qwen-plus">Qwen-Plus (均衡/推荐)</SelectItem>
                       <SelectItem value="qwen-max">Qwen-Max (最强/昂贵)</SelectItem>
                     </SelectContent>
                   </Select>
                </div>

                <div className="space-y-3">
                   <Label>API Key (令牌)</Label>
                   <div className="relative">
                      <Input 
                        type="password" 
                        value={config.ai.api_key} 
                        onChange={(e) => updateConfig("ai", "api_key", e.target.value)}
                        placeholder="sk-..." 
                      />
                   </div>
                   <p className="text-xs text-muted-foreground">留空则使用系统内置的默认 Key。</p>
                </div>

                <div className="space-y-3">
                   <Label>系统人设 (System Prompt)</Label>
                   <Textarea 
                      value={config.ai.system_prompt}
                      onChange={(e) => updateConfig("ai", "system_prompt", e.target.value)}
                      className="min-h-[100px]"
                      placeholder="你是一位..."
                   />
                   <p className="text-xs text-muted-foreground">定义 AI 的角色设定与回答偏好。</p>
                </div>
              </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>硬件与环境</CardTitle>
                <CardDescription>摄像头与运行模式控制。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="space-y-3">
                   <div className="flex items-center justify-between">
                     <Label>无人值守自动模式</Label>
                     <Switch 
                       checked={config.system.auto_mode}
                       onCheckedChange={(c) => updateConfig("system", "auto_mode", c)}
                     />
                   </div>
                 </div>

                 <div className="space-y-4 pt-4 border-t">
                    <Label>摄像头源 ID</Label>
                    <Input 
                      type="number" 
                      value={config.system.camera_index}
                      onChange={(e) => updateConfig("system", "camera_index", parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">0 通常为默认 Webcam，可尝试 1, 2 或输入 RTSP 地址。</p>
                 </div>

                 <div className="space-y-4 pt-4 border-t">
                    <Label>自动采集冷却 (秒)</Label>
                    <Input 
                      type="number" 
                      min="1"
                      value={config.system.cooldown_seconds} 
                      onChange={(e) => updateConfig("system", "cooldown_seconds", parseInt(e.target.value))} 
                    />
                 </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
             <Card>
               <CardHeader>
                 <CardTitle>数据管理</CardTitle>
                 <CardDescription>导出记录或释放磁盘空间。</CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                 <Button variant="outline" className="w-full justify-start gap-2" onClick={() => alert("导出功能开发中...")}>
                    <Download size={16} /> 导出所有记录为 Excel
                 </Button>
                 
                 <div className="border-t pt-4">
                    <Button variant="destructive" className="w-full justify-start gap-2" onClick={handleClearData}>
                       <Trash2 size={16} /> 格式化数据库 (清空所有记录)
                    </Button>
                    <p className="text-xs text-red-500 mt-2">慎用：此操作将永久删除所有识别记录与分析数据。</p>
                 </div>
               </CardContent>
             </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default SettingsPanel;
