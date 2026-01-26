import os
import cv2
import yaml
import numpy as np
from rembg import remove
from PIL import Image
from tqdm import tqdm
import glob

# ================= 紧急复原配置 =================
# 1. 这里填你从 Roboflow 下载的原始数据集路径
# 确保里面有 train, valid 这些文件夹
DATASET_ROOT = r"E:/实习相关/杭州得鹿山/食物视觉识别/标准框多菜品识别/FoodShot-1"

# 2. 输出位置 (会自动创建 materials 文件夹)
OUTPUT_ROOT = "materials"

# 3. 你的类别映射 (必须对应)
# 对应 ID: 0, 1, 2, 3...
CLASS_NAMES = {
    0: "ouhe",
    1: "qingjiaochaorou",
    2: "shuizhuroupian",
    3: "tudoudunniurou",
    4: "yuxiangrousi"
}
# ===============================================

def yolo_to_pixel(x, y, w, h, img_w, img_h):
    x1 = int((x - w / 2) * img_w)
    y1 = int((y - h / 2) * img_h)
    x2 = int((x + w / 2) * img_w)
    y2 = int((y + h / 2) * img_h)
    return max(0, x1), max(0, y1), min(img_w, x2), min(img_h, y2)

def recover_materials():
    print(f"🚀 开始复原素材库...")
    
    # 遍历 train 和 valid/test
    for split in ['train', 'valid', 'test']:
        images_dir = os.path.join(DATASET_ROOT, split, 'images')
        labels_dir = os.path.join(DATASET_ROOT, split, 'labels')
        
        if not os.path.exists(images_dir):
            continue

        # 查找图片
        image_files = glob.glob(os.path.join(images_dir, "*.*"))
        image_files = [f for f in image_files if f.lower().endswith(('.jpg', '.png', '.jpeg'))]
        
        print(f"📂 正在处理 {split} 集，共 {len(image_files)} 张...")

        for img_path in tqdm(image_files):
            # 找标签
            file_name = os.path.basename(img_path)
            label_name = os.path.splitext(file_name)[0] + ".txt"
            label_path = os.path.join(labels_dir, label_name)
            
            if not os.path.exists(label_path): continue
            
            # 读取图片
            img = cv2.imdecode(np.fromfile(img_path, dtype=np.uint8), cv2.IMREAD_COLOR)
            if img is None: continue
            h, w = img.shape[:2]
            
            with open(label_path, 'r') as f:
                lines = f.readlines()
                
            for idx, line in enumerate(lines):
                parts = line.strip().split()
                try:
                    cls_id = int(parts[0])
                    if cls_id not in CLASS_NAMES: continue
                    
                    cls_name = CLASS_NAMES[cls_id]
                    
                    # 坐标转换
                    cx, cy, nw, nh = map(float, parts[1:5])
                    x1, y1, x2, y2 = yolo_to_pixel(cx, cy, nw, nh, w, h)
                    
                    # 稍微扩大一点框 (Padding 10%)，防止切掉边缘
                    pad_x = int((x2-x1)*0.1)
                    pad_y = int((y2-y1)*0.1)
                    x1 = max(0, x1 - pad_x)
                    y1 = max(0, y1 - pad_y)
                    x2 = min(w, x2 + pad_x)
                    y2 = min(h, y2 + pad_y)
                    
                    crop = img[y1:y2, x1:x2]
                    if crop.size == 0: continue
                    
                    # --- 关键：去背景并保存 ---
                    # 转为 PIL
                    crop_pil = Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB))
                    
                    # 抠图
                    output_pil = remove(crop_pil)
                    
                    # 确保文件夹存在
                    save_dir = os.path.join(OUTPUT_ROOT, cls_name)
                    os.makedirs(save_dir, exist_ok=True)
                    
                    # 保存文件名
                    save_name = f"{os.path.splitext(file_name)[0]}_{split}_{idx}.png"
                    output_path = os.path.join(save_dir, save_name)
                    
                    output_pil.save(output_path)
                    
                    # --- 立即检查文件是否有效 ---
                    if os.path.getsize(output_path) == 0:
                        print(f"⚠️ 生成了空文件，已删除: {output_path}")
                        os.remove(output_path)

                except Exception:
                    continue

    print(f"\n✅ 素材库复原完成！位置: {os.path.abspath(OUTPUT_ROOT)}")
    print("现在可以去运行合成脚本了。")

if __name__ == "__main__":
    recover_materials()