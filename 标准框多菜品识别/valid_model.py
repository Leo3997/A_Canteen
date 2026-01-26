from ultralytics import YOLO
import pandas as pd

def test_yolo_model():
    # ================= 配置区域 =================
    # 1. 指向你训练好的最佳权重文件 (best.pt)
    MODEL_PATH = "E:/实习相关/杭州得鹿山/食物视觉识别/标准框多菜品识别/FoodShot-1/runs/detect/train_tray_v1/weights/best.pt"
    
    # 2. 数据集配置文件
    DATA_YAML_PATH = "E:/实习相关/杭州得鹿山/食物视觉识别/标准框多菜品识别/FoodShot-1/Synthetic_Dataset/data.yaml"
    # ===========================================

    print(f"正在加载模型: {MODEL_PATH}...")
    try:
        model = YOLO(MODEL_PATH)
    except Exception as e:
        print(f"❌ 错误: 找不到模型文件，请检查路径: {MODEL_PATH}")
        return

    print("🚀 开始在测试集上评估模型...")
    
    # 运行验证模式 (Val Mode)，但指定 split='test'
    # 这会告诉 YOLO 使用 data.yaml 中 'test:' 指定的数据集
    metrics = model.val(
        data=DATA_YAML_PATH,
        split='test',       # 关键参数：指定使用测试集
        imgsz=640,
        batch=16,
        conf=0.001,         # 测试时通常使用较低的置信度阈值来计算 mAP
        iou=0.6,            # NMS IoU 阈值
        plots=True,         # 生成混淆矩阵和 PR 曲线图
        save_json=True      # 保存详细的预测结果到 JSON 文件 (可选)
    )

    # --- 打印核心指标 ---
    print("\n" + "="*40)
    print("📊 测试集评估结果 (Test Metrics)")
    print("="*40)
    
    # mAP50-95 (最硬核的指标，综合了定位精准度和识别率)
    print(f"mAP50-95: {metrics.box.map:.4f}")
    
    # mAP50 (官方常用的指标，IoU阈值0.5)
    print(f"mAP50:    {metrics.box.map50:.4f}")
    
    # Precision (查准率: 说是红烧肉，真的是红烧肉的概率)
    print(f"Precision:{metrics.box.mp:.4f}")
    
    # Recall (查全率: 盘子里10块肉，能找出几块)
    print(f"Recall:   {metrics.box.mr:.4f}")
    
    # --- 打印每个类别的详细指标 ---
    print("\n📋 各类别详细表现:")
    # 获取类别名称映射
    names = model.names
    
    # metrics.box.maps 是一个数组，包含每个类别的 mAP50-95
    # 我们把它整理成表格打印出来
    class_metrics = []
    for i, ap in enumerate(metrics.box.maps):
        class_name = names[i]
        class_metrics.append({
            "Class": class_name,
            "mAP50-95": ap
        })
    
    df = pd.DataFrame(class_metrics)
    # 按 mAP 从低到高排序，帮你快速发现哪个菜最难识别
    df = df.sort_values(by="mAP50-95", ascending=True)
    print(df.to_string(index=False))
    
    print("\n✅ 测试完成！详细图表 (混淆矩阵、PR曲线) 已保存在 runs/detect/val... 文件夹中")

if __name__ == "__main__":
    test_yolo_model()