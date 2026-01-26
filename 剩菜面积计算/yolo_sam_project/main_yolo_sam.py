import cv2
import numpy as np
import torch
import os
from ultralytics import YOLO
from segment_anything import sam_model_registry, SamPredictor

# 配置
YOLO_MODEL_PATH = "models/yolov8n.pt"  # 建议使用训练好的餐盘检测模型
SAM_CHECKPOINT = "models/sam_vit_b.pth"
SAM_MODEL_TYPE = "vit_b"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

class YOLO_SAM_Analyzer:
    def __init__(self):
        print(f"正在加载 YOLO 模型 ({DEVICE})...")
        self.yolo = YOLO(YOLO_MODEL_PATH)
        
        print(f"正在加载 SAM 模型 ({DEVICE})...")
        sam = sam_model_registry[SAM_MODEL_TYPE](checkpoint=SAM_CHECKPOINT)
        sam.to(device=DEVICE)
        self.predictor = SamPredictor(sam)

    def process_image(self, image_path):
        # 1. 加载图片
        image = cv2.imread(image_path)
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        self.predictor.set_image(image_rgb)
        
        # 2. YOLO 检测餐格
        # classes=[?] 如果有特定的类 ID，可以在这里指定
        results = self.yolo(image, conf=0.25)
        boxes = results[0].boxes.xyxy.cpu().numpy()  # 获取 [x1, y1, x2, y2]
        
        # 3. 对每个检测到的框进行 SAM 分割
        final_mask = np.zeros(image.shape[:2], dtype=np.uint8)
        
        for box in boxes:
            # 使用 Box Prompt
            masks, scores, logits = self.predictor.predict(
                box=box,
                multimask_output=False
            )
            # 叠加掩码
            final_mask = cv2.bitwise_or(final_mask, (masks[0] * 255).astype(np.uint8))
            
        # 4. 可视化结果
        res_img = image.copy()
        # 绘制检测框
        for box in boxes:
            x1, y1, x2, y2 = map(int, box)
            cv2.rectangle(res_img, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
        # 绘制分割区域（半透明绿色）
        res_img[final_mask > 0] = res_img[final_mask > 0] * 0.5 + np.array([0, 255, 0]) * 0.5
        
        return res_img, final_mask

def main():
    # 确保模型文件存在 (这里仅作为逻辑演示，用户需将模型放入 models 目录)
    if not os.path.exists(YOLO_MODEL_PATH) or not os.path.exists(SAM_CHECKPOINT):
        print("错误: 请确保 models 目录下存在 yolov8n.pt 和 sam_vit_b.pth")
        return

    analyzer = YOLO_SAM_Analyzer()
    
    # 示例处理 (需替换为实际图片路径)
    input_dir = "../picture"
    output_dir = "output"
    
    if not os.path.exists(input_dir):
        print(f"跳过: 未找到输入目录 {input_dir}")
        return

    for img_name in os.listdir(input_dir):
        if img_name.lower().endswith(('.png', '.jpg', '.jpeg')):
            path = os.path.join(input_dir, img_name)
            print(f"正在分析: {img_name}")
            res_vis, mask = analyzer.process_image(path)
            cv2.imwrite(os.path.join(output_dir, f"res_{img_name}"), res_vis)

if __name__ == "__main__":
    main()
