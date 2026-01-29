import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Calendar, Map, Image as ImageIcon, CheckCircle2, AlertCircle } from "lucide-react";

interface RecordDetail {
  id: number;
  timestamp: string;
  image_path: string;
  heatmap_path: string | null;
  total_waste_rate: number;
  details: {
    food_name: string;
    waste_rate: number;
    original_grid: string;
  }[];
}

interface RecordDetailModalProps {
  record: RecordDetail | null;
  onClose: () => void;
}

const API_BASE = "http://localhost:8000";

const RecordDetailModal: React.FC<RecordDetailModalProps> = ({ record, onClose }) => {
  const [showHeatmap, setShowHeatmap] = useState(false);

  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="bg-background border border-border w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/30">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              记录详情 <span className="text-muted-foreground font-normal text-sm"># {record.id}</span>
            </h2>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {new Date(record.timestamp).toLocaleString()}
              </span>
              <span className={`font-bold ${record.total_waste_rate > 20 ? 'text-amber-500' : 'text-emerald-500'}`}>
                总播放率: {record.total_waste_rate}%
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
            <X size={18} />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left: Image Container */}
          <div className="flex-[2] bg-neutral-900 relative group min-h-[300px] md:min-h-0">
            <img 
              src={`${API_BASE}/static/results/${showHeatmap && record.heatmap_path ? record.heatmap_path : record.image_path}`}
              alt="Analysis"
              className="w-full h-full object-contain transition-all duration-500"
            />
            
            {/* Overlay controls */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant={!showHeatmap ? "default" : "secondary"}
                  className="h-8 gap-2 rounded-full overflow-hidden" 
                  onClick={() => setShowHeatmap(false)}
                >
                  <ImageIcon size={14} /> 分析图
                </Button>
                {record.heatmap_path && (
                  <Button 
                    size="sm" 
                    variant={showHeatmap ? "default" : "secondary"}
                    className="h-8 gap-2 rounded-full overflow-hidden"
                    onClick={() => setShowHeatmap(true)}
                  >
                    <Map size={14} /> 热力图
                  </Button>
                )}
              </div>
              <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] text-white/80 font-bold uppercase tracking-widest">
                {showHeatmap ? "Heatmap View" : "Result View"}
              </div>
            </div>
            
            {!record.heatmap_path && showHeatmap && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm">
                  暂无热力图数据
               </div>
            )}
          </div>

          {/* Right: Details List */}
          <div className="flex-1 border-l flex flex-col bg-background min-w-[320px]">
            <div className="p-4 border-b bg-muted/10">
              <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                分格识别结果
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">
                  {record.details.length} 个区域
                </span>
              </h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {record.details.map((item, idx) => (
                  <div key={idx} className="group p-3 rounded-xl border border-border/50 bg-muted/5 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">
                          {idx + 1}
                        </div>
                        <span className="text-sm font-bold">{item.food_name}</span>
                      </div>
                      <span className={`text-sm font-black ${
                        item.waste_rate > 50 ? 'text-red-500' : 
                        item.waste_rate > 20 ? 'text-amber-500' : 'text-primary'
                      }`}>
                        {item.waste_rate}%
                      </span>
                    </div>
                    
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${
                          item.waste_rate > 50 ? 'bg-red-500' : 
                          item.waste_rate > 20 ? 'bg-amber-500' : 'bg-primary'
                        }`}
                        style={{ width: `${item.waste_rate}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                      <span>分格 ID: {item.original_grid}</span>
                      <span className="flex items-center gap-1">
                        {item.waste_rate > 50 ? <AlertCircle size={10} className="text-red-500" /> : <CheckCircle2 size={10} className="text-emerald-500" />}
                        {item.waste_rate > 20 ? "高剩余" : "低剩余"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="p-4 border-t bg-muted/10">
               <Button variant="outline" className="w-full text-xs" onClick={onClose}>
                  返回列表
               </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordDetailModal;
