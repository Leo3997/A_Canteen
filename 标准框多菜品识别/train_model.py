import os
from ultralytics import YOLO

def train_model():
    # ================= 配置区域 =================
    # 1. 任务名称 (生成的模型会保存在 runs/detect/train_tray_v1)
    PROJECT_NAME = "train_tray_v1"
    
    # 2. 数据集配置文件路径 (建议使用绝对路径，防止报错)
    # 假设你的合成数据集文件夹叫 Synthetic_Dataset
    DATA_YAML_PATH = os.path.abspath("Synthetic_Dataset/data.yaml")
    
    # 3. 预训练模型
    # 因为是矩形框检测，使用 yolov8s.pt (不要用 -seg)
    # s版 (Small) 速度和精度的平衡最好；n版 (Nano) 最快但精度稍低
    MODEL_WEIGHTS = "yolov8s.pt" 
    # ===========================================

    print(f"正在加载模型: {MODEL_WEIGHTS}...")
    print(f"读取数据集配置: {DATA_YAML_PATH}")

    # 加载模型
    model = YOLO(MODEL_WEIGHTS)

    # 开始训练
    model.train(
        data=DATA_YAML_PATH,
        
        # 训练轮数
        # 合成数据非常干净，通常 50 轮就收敛了，100 轮更稳
        epochs=100,
        
        # 图片大小
        # 如果你的餐盘图是宽屏的，YOLO会自动适配
        imgsz=640,
        
        # 批次大小
        # 显存够大(如3060以上)可以开32，不够就16
        batch=16,
        
        # 任务类型 (检测)
        task='detect',
        
        # 结果保存命名
        name=PROJECT_NAME,
        
        # === 针对合成数据的特殊优化 ===
        # 关闭最后 10 轮的 Mosaic 增强
        # 因为合成数据本身就是拼接的，Mosaic 把它们再切碎可能破坏餐盘结构
        close_mosaic=10,
        
        # === 针对 Windows 系统的关键设置 ===
        # 必填！否则会报错 DataLoader worker thread...
        workers=0,
        
        # 早停机制
        # 如果 15 轮 Loss 都不下降，提前结束
        patience=15,
        
        # 初始学习率 (默认0.01)
        # 合成数据特征很明显，默认参数通常就能跑得很好
        lr0=0.01,
    )
    
    print("训练结束！最佳模型保存在 runs/detect/" + PROJECT_NAME + "/weights/best.pt")

if __name__ == "__main__":
    train_model()