import cv2
from ultralytics import YOLO
from collections import Counter
import time

def run_webcam_detection():
    # ================= 配置区域 =================
    # 1. 模型路径 (指向你训练好的 best.pt)
    MODEL_PATH = "E:\\实习相关\\杭州得鹿山\\食物视觉识别\\标准框多菜品识别\\runs\\detect\\train_tray_v1\\weights\\best.pt"

    # 2. 摄像头编号 (0 通常是默认摄像头，如果有外接USB摄像头可能是 1)
    CAMERA_INDEX = 0

    # 3. 置信度阈值
    # 合成数据训练的模型在真实场景可能需要调整这个值
    # 如果检测不到，尝试调低 (e.g., 0.25)
    # 如果误检太多，尝试调高 (e.g., 0.6)
    CONF_THRESHOLD = 0.4 
    # ===========================================

    print(f"正在加载模型: {MODEL_PATH}...")
    try:
        model = YOLO(MODEL_PATH)
    except Exception as e:
        print(f"❌ 无法加载模型，请检查路径。错误: {e}")
        return

    # 打开摄像头
    cap = cv2.VideoCapture(CAMERA_INDEX)
    if not cap.isOpened():
        print(f"❌ 无法打开摄像头 (Index {CAMERA_INDEX})")
        return

    # 设置摄像头分辨率 (可选，取决于你的硬件)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    print("🚀 摄像头已启动！按 'q' 键退出。")

    # 用于计算FPS
    prev_frame_time = 0
    new_frame_time = 0

    while True:
        success, frame = cap.read()
        if not success:
            break

        # --- 核心推理步骤 ---
        # stream=True 让处理更流畅，verbose=False 不在终端刷屏
        results = model(frame, conf=CONF_THRESHOLD, verbose=False)

        # --- 结果解析与统计 ---
        # results[0] 是当前帧的结果
        result = results[0]
        
        # 1. 绘制检测框 (YOLO 自带的 plot 方法非常方便)
        # 这会在 frame 上画出框和标签
        annotated_frame = result.plot()

        # 2. 统计当前画面中的菜品
        # 获取所有检测到的类别 ID
        cls_ids = result.boxes.cls.cpu().numpy().astype(int)
        # 转换为类别名称
        detected_names = [model.names[i] for i in cls_ids]
        # 计数 (例如: {'rice': 1, 'meat': 2})
        counts = Counter(detected_names)

        # --- 在画面上叠加信息 ---
        # A. 显示 FPS
        new_frame_time = time.time()
        fps = 1 / (new_frame_time - prev_frame_time)
        prev_frame_time = new_frame_time
        cv2.putText(annotated_frame, f"FPS: {int(fps)}", (10, 30), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        # B. 显示菜品统计清单 (左上角)
        y_offset = 70
        cv2.putText(annotated_frame, "Current Dishes:", (10, y_offset), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        for name, count in counts.items():
            y_offset += 30
            text = f"- {name}: {count}"
            # 绘制文字背景 (黑色半透明) 让文字更清晰
            (w, h), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
            cv2.rectangle(annotated_frame, (10, y_offset - h), (10 + w, y_offset + 5), (0, 0, 0), -1)
            # 绘制文字
            cv2.putText(annotated_frame, text, (10, y_offset), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

        # --- 显示最终画面 ---
        cv2.imshow("Food Recognition System (Press 'q' to exit)", annotated_frame)

        # 按 'q' 退出
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # 释放资源
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_webcam_detection()