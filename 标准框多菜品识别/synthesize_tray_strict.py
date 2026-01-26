import os
import random
import yaml
from PIL import Image
from tqdm import tqdm

# 1. 路径设置
BACKGROUND_PATH = "餐盘.jpg"       # 你的空餐盘图
MATERIALS_ROOT = r"E:/实习相关/杭州得鹿山/食物视觉识别/标准框多菜品识别/materials"           # 你的素材根目录
OUTPUT_DIR = "Synthetic_Dataset"             # 输出文件夹
NUM_IMAGES = 500                         # 生成多少张

# 2. 严格的 ID 映射
# 格式: "文件夹名": ID
CLASS_ID_MAP = {
    "rice": 0,
    "mantou": 1,
    "ouhe": 2,
    "qingjiaochaorou": 3,
    "shuizhuroupian": 4,
    "tudoudunniurou": 5,
    "yuxiangrousi": 6
}

# 3. 菜品分类 (用于区分哪个格子放什么)
# 主食列表 (对应 ID 0, 1)
STAPLE_FOLDERS = ["rice", "mantou"]
# 菜品列表 (对应 ID 2, 3, 4, 5, 6)
DISH_FOLDERS = ["ouhe", "qingjiaochaorou", "shuizhuroupian", "tudoudunniurou", "yuxiangrousi"]

# 4. 餐盘格子坐标定义
# 格式: [x1, y1, x2, y2] (左上角x, 左上角y, 右下角x, 右下角y)
TRAY_SLOTS = {
    "slot_1": [626, 78, 943, 391],     # 格子1 左上(放菜)
    "slot_2": [1045, 81, 1384, 398],    # 格子2 右上(放菜)
    "slot_3": [196, 455, 577, 835],    # 格子3 左下(放菜)
    "slot_4": [778, 534, 1357, 842]    # 格子4 右下(放主食)
}

def synthesize_images():
    # 创建输出目录
    img_out = os.path.join(OUTPUT_DIR, "images")
    lbl_out = os.path.join(OUTPUT_DIR, "labels")
    os.makedirs(img_out, exist_ok=True)
    os.makedirs(lbl_out, exist_ok=True)

    # 加载背景
    if not os.path.exists(BACKGROUND_PATH):
        print(f"❌ 错误: 找不到背景图 {BACKGROUND_PATH}")
        return
    bg_template = Image.open(BACKGROUND_PATH).convert("RGBA")
    bg_w, bg_h = bg_template.size

    # 预加载素材路径
    material_files = {}
    for name in CLASS_ID_MAP.keys():
        folder_path = os.path.join(MATERIALS_ROOT, name)
        if os.path.exists(folder_path):
            # 获取该文件夹下所有图片
            files = [os.path.join(folder_path, f) for f in os.listdir(folder_path) if f.endswith('.png')]
            if files:
                material_files[name] = files
            else:
                print(f"⚠️ 警告: 文件夹 {name} 是空的！")
        else:
            print(f"⚠️ 警告: 找不到文件夹 {folder_path}")

    print(f"开始生成 {NUM_IMAGES} 张图片...")
    for i in tqdm(range(NUM_IMAGES)):
        current_bg = bg_template.copy()
        labels = []

        # --- 步骤1: 决定这一餐吃什么 ---
        # A. 从5个菜中随机选3个 (不重复)
        # 如果菜品不够3个，就允许重复
        if len(DISH_FOLDERS) >= 3:
            chosen_dishes = random.sample(DISH_FOLDERS, 3)
        else:
            chosen_dishes = [random.choice(DISH_FOLDERS) for _ in range(3)]
        
        # B. 从2个主食中随机选1个
        chosen_staple = random.choice(STAPLE_FOLDERS)
        # 组合成当前的填充计划: [(格子名, 菜名), ...]
        fill_plan = [
            ("slot_1", chosen_dishes[0]),
            ("slot_2", chosen_dishes[1]),
            ("slot_3", chosen_dishes[2]),
            ("slot_4", chosen_staple)  # 格子4 必须放主食
        ]

        # --- 步骤2: 执行粘贴与标签生成 ---
        for slot_name, food_name in fill_plan:
            # 1. 获取坐标
            coords = TRAY_SLOTS[slot_name]
            x1, y1, x2, y2 = coords
            target_w, target_h = x2 - x1, y2 - y1

            # 2. 获取对应的随机图片
            if food_name not in material_files: continue
            img_path = random.choice(material_files[food_name]) # 即使只有一张图也没问题
            
            food_img = Image.open(img_path).convert("RGBA")

            # 3. 强制缩放 (铺满格子)
            food_resized = food_img.resize((target_w, target_h), Image.Resampling.LANCZOS)

            # 4. 粘贴
            current_bg.paste(food_resized, (x1, y1), food_resized)

            # 5. 生成标签数据
            class_id = CLASS_ID_MAP[food_name]
            
            # 计算 YOLO 格式 (中心点归一化)
            center_x = (x1 + target_w / 2) / bg_w
            center_y = (y1 + target_h / 2) / bg_h
            norm_w = target_w / bg_w
            norm_h = target_h / bg_h

            labels.append(f"{class_id} {center_x:.6f} {center_y:.6f} {norm_w:.6f} {norm_h:.6f}")
        
        # --- 步骤3: 保存 ---
        # 保存图片
        filename = f"synth_{i:06d}"
        current_bg.convert("RGB").save(os.path.join(img_out, filename + ".jpg"), quality=95)
        
        # 保存标签
        with open(os.path.join(lbl_out, filename + ".txt"), "w") as f:
            f.write("\n".join(labels))
    

    # --- 步骤4: 生成 data.yaml (确保 ID 对应正确) ---
    print("正在生成配置文件...")
    # 根据 ID 排序生成 names 列表
    sorted_names = [None] * len(CLASS_ID_MAP)
    for name, cid in CLASS_ID_MAP.items():
        sorted_names[cid] = name
    
    yaml_content = {
        'path': os.path.abspath(OUTPUT_DIR),
        'train': 'images',
        'val': 'images',
        'nc': len(sorted_names),
        'names': sorted_names
    }

    with open(os.path.join(OUTPUT_DIR, "data.yaml"), "w") as f:
        yaml.dump(yaml_content, f, sort_keys=False)

    print(f"\n✅ 完成！数据集保存在 {OUTPUT_DIR}")
    print(f"ID 映射确认: {sorted_names}")

if __name__ == "__main__":
    synthesize_images()
    


