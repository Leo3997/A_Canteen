
import os
import pandas as pd
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List
from ..models import MealRecord, WasteDetail

REPORT_DIR = "static/reports"

class ReportService:
    def __init__(self, db: Session):
        self.db = db
        if not os.path.exists(REPORT_DIR):
            os.makedirs(REPORT_DIR)

    def generate_excel_report(self) -> str:
        """
        生成全量分析报告 Excel
        返回文件相对路径
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"canteen_analysis_report_{timestamp}.xlsx"
        filepath = os.path.join(REPORT_DIR, filename)

        # 1. 获取数据
        summary_data = self._get_summary_data()
        trend_data = self._get_trend_data()
        dish_data = self._get_dish_data()
        raw_data = self._get_raw_data()

        # 2. 写入 Excel
        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            # Sheet 1: 经营总览
            pd.DataFrame([summary_data]).to_excel(writer, sheet_name='经营总览', index=False)
            
            # Sheet 2: 趋势分析
            if trend_data:
                pd.DataFrame(trend_data).to_excel(writer, sheet_name='趋势分析', index=False)
            
            # Sheet 3: 菜品排行
            if dish_data:
                pd.DataFrame(dish_data).to_excel(writer, sheet_name='菜品排行', index=False)
                
            # Sheet 4: 原始记录
            if raw_data:
                pd.DataFrame(raw_data).to_excel(writer, sheet_name='原始识别记录', index=False)

        return filepath

    def _get_summary_data(self) -> Dict[str, Any]:
        """获取汇总数据"""
        total_records = self.db.query(MealRecord).count()
        avg_waste = self.db.query(func.avg(MealRecord.total_waste_rate)).scalar() or 0.0
        
        # 计算今日数据
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_count = self.db.query(MealRecord).filter(MealRecord.timestamp >= today_start).count()
        today_waste = self.db.query(func.avg(MealRecord.total_waste_rate)).filter(MealRecord.timestamp >= today_start).scalar() or 0.0

        # 计算今日最浪费和最受欢迎菜品
        today_dishes = self.db.query(
            WasteDetail.food_name,
            func.avg(WasteDetail.waste_rate).label("avg_waste")
        ).join(MealRecord).filter(MealRecord.timestamp >= today_start)\
         .group_by(WasteDetail.food_name).all()

        most_wasted_dish = "暂无数据"
        most_popular_dish = "暂无数据"
        
        if today_dishes:
            # 剩菜率最高 = 最浪费
            wasted = max(today_dishes, key=lambda x: x.avg_waste)
            most_wasted_dish = f"{wasted.food_name} ({round(wasted.avg_waste, 1)}%)"
            
            # 剩菜率最低 = 最受欢迎
            popular = min(today_dishes, key=lambda x: x.avg_waste)
            most_popular_dish = f"{popular.food_name} ({round(popular.avg_waste, 1)}%)"

        return {
            "报告生成时间": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "累计识别总数": total_records,
            "平均浪费率": round(avg_waste, 2),
            "今日新增记录": today_count,
            "今日平均浪费": round(today_waste, 2),
            "今日最浪费菜品": most_wasted_dish,
            "今日最受欢迎菜品": most_popular_dish
        }

    def _get_trend_data(self) -> List[Dict]:
        """每日趋势"""
        # SQLite 的日期格式化可能需要注意，这里假设是标准的 datetime 存储
        # 简单起见，拉取所有数据在 Pandas 处理，或者使用 SQL
        # 考虑到数据量不大，直接拉取部分字段
        records = self.db.query(MealRecord.timestamp, MealRecord.total_waste_rate).all()
        data = [{"timestamp": r.timestamp, "waste_rate": r.total_waste_rate} for r in records]
        if not data:
            return []
        
        df = pd.DataFrame(data)
        df['date'] = pd.to_datetime(df['timestamp']).dt.date
        daily = df.groupby('date')['waste_rate'].mean().reset_index()
        daily.columns = ['日期', '平均浪费率']
        return daily.to_dict('records')

    def _get_dish_data(self) -> List[Dict]:
        """菜品分析"""
        results = self.db.query(
            WasteDetail.food_name,
            func.count(WasteDetail.id).label("count"),
            func.avg(WasteDetail.waste_rate).label("avg_waste")
        ).group_by(WasteDetail.food_name).all()
        
        return [
            {
                "菜品名称": r.food_name,
                "识别频次": r.count,
                "平均剩余率": round(r.avg_waste, 2)
            }
            for r in results
        ]

    def _get_raw_data(self) -> List[Dict]:
        """原始记录明细"""
        # Join WasteDetail to get food items string
        records = self.db.query(MealRecord).order_by(MealRecord.timestamp.desc()).limit(1000).all()
        data = []
        for r in records:
            items = ", ".join([f"{d.food_name}({d.waste_rate}%)" for d in r.details])
            data.append({
                "ID": r.id,
                "时间": r.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                "总浪费率": r.total_waste_rate,
                "置信度": r.confidence,
                "包含菜品明细": items
            })
        return data

def get_report_service(db: Session):
    return ReportService(db)
