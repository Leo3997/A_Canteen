import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Utensils, Search, Trophy, Medal, Star, TrendingDown, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";

interface AnalyticsViewProps {
  stats: any[];
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ stats }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStats = stats.filter(item => 
    item.food_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper to render rank badge
  const renderRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg shadow-yellow-500/20"><Trophy size={16} className="text-white" /></div>;
      case 2:
        return <div className="w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center shadow-lg shadow-slate-400/20"><Medal size={16} className="text-white" /></div>;
      case 3:
        return <div className="w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center shadow-lg shadow-amber-700/20"><Medal size={16} className="text-white" /></div>;
      default:
        return <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border font-bold text-xs">{rank}</div>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h3 className="text-2xl font-black font-heading tracking-tight">菜品剩余率排行榜</h3>
           <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">基于近期识别数据统计</p>
        </div>
        <div className="relative w-full md:w-72">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           <Input 
             placeholder="搜索菜品名称..." 
             className="pl-10 h-10 rounded-xl bg-muted/30 border-none shadow-inner" 
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
      </div>

      <div className="space-y-3">
         {filteredStats.map((item, idx) => {
           const rank = idx + 1;
           const isTop3 = rank <= 3;
           
           return (
             <Card 
               key={idx} 
               className={`group transition-all hover:scale-[1.01] hover:shadow-xl border-border/40 overflow-hidden rounded-2xl ${
                 isTop3 ? 'bg-gradient-to-r from-muted/50 to-background border-l-4 border-l-primary/30' : 'bg-background hover:bg-muted/10'
               }`}
             >
               <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                 {/* Rank & Info */}
                 <div className="flex items-center gap-4 min-w-[200px]">
                   <div className="flex-shrink-0">
                     {renderRankBadge(rank)}
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2">
                       <h4 className="font-bold text-base truncate">{item.food_name}</h4>
                       {isTop3 && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
                     </div>
                     <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                       样本总数: {item.sample_count} 次识别
                     </p>
                   </div>
                 </div>

                 {/* Progress Bar & Rate */}
                 <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-4">
                   <div className="flex-1 space-y-2">
                     <div className="flex justify-between items-end">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase">平均剩余率分布</span>
                        <span className="text-xs font-black">{item.average_waste_rate}%</span>
                     </div>
                     <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                       <div 
                         className={`h-full rounded-full transition-all duration-1000 ${
                           item.average_waste_rate > 50 ? 'bg-red-500' : 
                           item.average_waste_rate > 20 ? 'bg-amber-500' : 'bg-emerald-500'
                         }`}
                         style={{ width: `${Math.min(item.average_waste_rate, 100)}%` }}
                       />
                     </div>
                   </div>

                   {/* Stats */}
                   <div className="flex items-center gap-6 sm:w-48 justify-end">
                     <div className="text-right">
                       <div className="text-[10px] text-muted-foreground font-bold uppercase leading-none mb-1">受欢迎度</div>
                       <div className="flex items-center gap-1 justify-end">
                         <span className="text-sm font-black">{item.popularity_score}</span>
                         {item.popularity_score > 80 ? (
                           <TrendingUp size={12} className="text-emerald-500" />
                         ) : item.popularity_score < 50 ? (
                           <TrendingDown size={12} className="text-red-500" />
                         ) : null}
                       </div>
                     </div>
                     <div className="w-px h-8 bg-border/50 hidden sm:block" />
                     <div className="text-right sm:min-w-[60px]">
                        <Utensils size={18} className={`ml-auto ${isTop3 ? 'text-primary' : 'text-muted-foreground/30'}`} />
                     </div>
                   </div>
                 </div>
               </CardContent>
             </Card>
           );
         })}
         
         {filteredStats.length === 0 && (
           <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
             <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
               <Search size={24} className="text-muted-foreground/50" />
             </div>
             <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">未能找到匹配的菜品数据</p>
           </div>
         )}
      </div>
    </div>
  );
};

export default AnalyticsView;
