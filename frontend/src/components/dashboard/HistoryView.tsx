import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, Trash2, Eye } from "lucide-react";

interface HistoryViewProps {
  records: any[];
  total: number;
  page: number;
  setPage: (page: number) => void;
  onViewDetail: (id: number) => void;
  onDelete: (id: number) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ 
  records, 
  total, 
  page, 
  setPage, 
  onViewDetail, 
  onDelete 
}) => {
  const totalPages = Math.ceil(total / 8);
  const API_BASE = "http://localhost:8000";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {records.map((record) => (
          <Card key={record.id} className="group overflow-hidden border-border shadow-sm hover:shadow-md transition-all">
            <div className="aspect-video relative overflow-hidden bg-muted">
              <img 
                src={`${API_BASE}/static/results/${record.image_path}`} 
                alt={`Record ${record.id}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="h-8 w-8 p-0 rounded-full"
                  onClick={() => onViewDetail(record.id)}
                >
                  <Eye size={14} />
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  className="h-8 w-8 p-0 rounded-full"
                  onClick={() => onDelete(record.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur rounded text-[10px] text-white font-mono">
                {new Date(record.timestamp).toLocaleString()}
              </div>
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-muted-foreground">ID: #{record.id}</span>
                <span className={`text-sm font-bold ${
                  record.total_waste_rate > 20 ? 'text-amber-500' : 'text-emerald-500'
                }`}>
                  {record.total_waste_rate}% 剩余
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Calendar size={10} />
                <span>AI 置信度: {record.confidence}%</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage(page - 1)} 
            disabled={page <= 1}
          >
            <ChevronLeft size={16} /> 上一页
          </Button>
          <span className="text-sm font-medium">
            第 {page} / {totalPages} 页
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage(page + 1)} 
            disabled={page >= totalPages}
          >
            下一页 <ChevronRight size={16} />
          </Button>
        </div>
      )}

      {records.length === 0 && (
        <div className="py-20 text-center text-muted-foreground">
          暂无历史记录
        </div>
      )}
    </div>
  );
};

export default HistoryView;
