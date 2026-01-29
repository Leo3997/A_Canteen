import React from "react";
import { TiltedCard, CountUp } from "@/components/ui/animated-components";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Utensils, Activity, ChevronRight } from "lucide-react";

const API_BASE = "http://localhost:8000";

interface LiveFeedProps {
  analysisResult: any;
  uploading: boolean;
  cooldown: boolean;
  setActiveTab: (tab: string) => void;
}

const LiveFeed: React.FC<LiveFeedProps> = ({ analysisResult, uploading, cooldown, setActiveTab }) => {
  return (
    <div className="grid lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-1000">
      <TiltedCard className="lg:col-span-2 shadow-2xl border-border bg-neutral-900 overflow-hidden relative group min-h-[480px] rounded-xl">
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
        {uploading && <div className="scan-line" />}
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
              {analysisResult ? <><CountUp to={analysisResult.total_waste_rate} decimals={1} />%</> : "等待数据..."}
            </h3>
            <p className="text-sm font-medium text-white/80 flex items-center gap-2">
              {analysisResult ? "实时浪费率监测已完成" : "正在实时监测用餐区域..."}
            </p>
          </div>
        </div>
      </TiltedCard>

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
  );
};

export default LiveFeed;
