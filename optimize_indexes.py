import sqlite3
import os

db_path = "smart_canteen.db"

def optimize_db():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        print(">>> 正在优化数据库索引...")
        
        # 1. 索引：按时间范围查询记录 (用于仪表盘)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_meal_records_timestamp ON meal_records(timestamp);")
        
        # 2. 索引：按食物名称聚合统计 (用于口味分析)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_waste_details_food_name ON waste_details(food_name);")
        
        # 3. 索引：按记录 ID 查询详情 (用于详情页)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_waste_details_meal_record_id ON waste_details(meal_record_id);")

        conn.commit()
        print("✅ 数据库索引优化完成")
    except Exception as e:
        print(f"❌ 优化失败: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    optimize_db()
