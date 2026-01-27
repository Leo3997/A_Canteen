import sqlite3
import os

db_path = "f:/视觉识别食堂/smart_canteen.db"

if os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_meal_records_timestamp ON meal_records (timestamp)")
        conn.commit()
        conn.close()
        print("✅ 索引已同步")
    except Exception as e:
        print(f"❌ 错误: {e}")
else:
    print("❌ 未找到数据库")
