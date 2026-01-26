import uvicorn
import os
import sys

# 将当前目录添加到路径以便导入 backend 包
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    # 确保在根目录下启动，或者手动指定 app 路径
    # 使用字符串形式以支持多进程/重载
    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=True)
