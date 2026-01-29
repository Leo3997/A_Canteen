import React from "react";
import { Activity, ArrowUpRight, Utensils } from "lucide-react";
import { SpotlightCard, CountUp } from "@/components/ui/animated-components";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface StatsOverviewProps {
  summary: {
    total_records: number;
    growth_rate: number;
    avg_waste_rate: number;
    accuracy: number;
    active_nodes: number;
  };
  trends: {
    waste: number[];
    records: number[];
    accuracy: number[];
  };
  isInitialLoading: boolean;
}

const CompactChart: React.FC<{ data: number[], color: string, id: string }> = ({ data, color, id }) => {
    const chartData = data.map((val, i) => ({ value: val, time: i }));
    return (
      <div className="w-[100px] h-[40px]">
        <AreaChart width={100} height={40} data={chartData}>
          <defs>
            <linearGradient id={`gradient-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2} 
            fillOpacity={1} 
            fill={`url(#gradient-${id})`} 
            isAnimationActive={false}
          />
        </AreaChart>
      </div>
    );
};

const StatsOverview: React.FC<StatsOverviewProps> = ({ summary, trends, isInitialLoading }) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in duration-700 slide-in-from-top-2">
      <SpotlightCard className="shadow-none border-border rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-tight">累计记录数</CardTitle>
          <Activity size={16} className="text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold font-heading">
              {isInitialLoading ? <div className="h-8 w-16 skeleton mb-1" /> : <CountUp to={summary.total_records} />}
            </div>
            <div className="text-xs text-muted-foreground font-medium mt-1">
              {isInitialLoading ? <div className="h-3 w-20 skeleton" /> : <><span className="text-emerald-500 font-bold">+{summary.growth_rate}%</span> 较上月</>}
            </div>
          </div>
          <div className="pb-1">
            <CompactChart data={trends.records} color="#10b981" id="records" />
          </div>
        </CardContent>
      </SpotlightCard>

      <SpotlightCard className="shadow-none border-border rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-tight">平均浪费率</CardTitle>
          <ArrowUpRight size={16} className={`text-muted-foreground ${summary.avg_waste_rate > 20 ? 'text-red-500' : 'text-emerald-500'}`} />
        </CardHeader>
        <CardContent className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold font-heading">
              {isInitialLoading ? <div className="h-8 w-16 skeleton mb-1" /> : <><CountUp to={summary.avg_waste_rate} decimals={1} />%</>}
            </div>
            <div className="text-xs text-muted-foreground font-medium mt-1">
              {isInitialLoading ? <div className="h-3 w-20 skeleton" /> : (
                <span className={summary.avg_waste_rate < 20 ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>
                  {summary.avg_waste_rate < 20 ? "表现优异" : "需关注"}
                </span>
              )}
            </div>
          </div>
          <div className="pb-1">
            <CompactChart data={trends.waste} color={summary.avg_waste_rate > 20 ? "#f59e0b" : "#10b981"} id="waste" />
          </div>
        </CardContent>
      </SpotlightCard>

      <SpotlightCard className="shadow-none border-border rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-tight">识别准确率</CardTitle>
          <Utensils size={16} className="text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold font-heading">
              {isInitialLoading ? <div className="h-8 w-16 skeleton mb-1" /> : (
                <>{summary.accuracy > 0 ? <CountUp to={summary.accuracy} decimals={1} /> : "计算中..."}{summary.accuracy > 0 && "%"}</>
              )}
            </div>
            <div className="text-xs text-muted-foreground font-medium mt-1">
              {isInitialLoading ? <div className="h-3 w-24 skeleton" /> : (
                <><span className="text-primary font-bold">{summary.accuracy > 90 ? "极高" : "稳定"}</span> 模型状态良好</>
              )}
            </div>
          </div>
          <div className="pb-1">
            <CompactChart data={trends.accuracy} color="#8b5cf6" id="accuracy" />
          </div>
        </CardContent>
      </SpotlightCard>

      <SpotlightCard className="shadow-none border-border rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-tight">活跃监测节点</CardTitle>
          <Activity size={16} className="text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-heading">
            {isInitialLoading ? <div className="h-8 w-24 skeleton mb-1" /> : <>{summary.active_nodes} 节点</>}
          </div>
          <div className="text-xs text-muted-foreground font-medium mt-1">
            {isInitialLoading ? <div className="h-3 w-20 skeleton" /> : <><span className="text-emerald-500 font-bold">运行正常</span> - 实时监控中</>}
          </div>
        </CardContent>
      </SpotlightCard>
    </div>
  );
};

export default StatsOverview;
