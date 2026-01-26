import cv2
import numpy as np
import json
import os

def calibrate_template(image_path, output_json="plate_template.json"):
    """
    交互式标定脚本：
    1. 在模板图上选择 4 个格子区域
    2. 提取特征点用于后续实时匹配
    """
    img = cv2.imread(image_path)
    if img is None:
        print(f"错误：无法读取图片 {image_path}")
        return

    # 1. 交互式选择 4 个格子
    dish_names = ["菜品区 1 (左上)", "菜品区 2 (右中)", "菜品区 3 (左长格)", "米饭区 (下长格)"]
    dish_rois = []

    print("\n--- 开始标定任务 ---")
    print("操作提示：")
    print("1. 弹窗中会出现您的餐盘图片。")
    print("2. 鼠标拖动框选出对应的格子。")
    print("3. 按下 'Enter' 或 'Space' 确认当前框选。")
    print("4. 如果选错了，按 'c' 重新选。")
    print("------------------\n")

    for name in dish_names:
        print(f"请框选：{name}")
        roi = cv2.selectROI(f"Select {name}", img, fromCenter=False, showCrosshair=True)
        cv2.destroyWindow(f"Select {name}")
        # roi format: (x, y, w, h)
        dish_rois.append(roi)

    # 2. 提取特征点 (ORB) 用于实时对齐
    orb = cv2.ORB_create(nfeatures=2000)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    kp, des = orb.detectAndCompute(gray, None)

    # 3. 准备保存数据
    # 特征点需要转为列表才好存 JSON
    kp_list = []
    for p in kp:
        kp_list.append({
            "pt": p.pt,
            "size": p.size,
            "angle": p.angle,
            "response": p.response,
            "octave": p.octave,
            "class_id": p.class_id
        })

    template_data = {
        "image_size": [img.shape[1], img.shape[0]],
        "rois": dish_rois,
        "roi_names": dish_names,
        "descriptors": des.tolist(),
        "keypoints": kp_list
    }

    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(template_data, f, ensure_ascii=False, indent=4)

    print(f"\n[成功] 标定数据已保存至: {output_json}")
    print("现在您可以运行更新后的实时识别脚本了！")

if __name__ == "__main__":
    # 使用用户上传的图片作为模板
    TEMPLATE_IMG = r"C:\Users\17646\.gemini\antigravity\brain\5d226b27-b6ff-4cc1-b5de-20319547f280\uploaded_media_1769397987786.jpg"
    calibrate_template(TEMPLATE_IMG)
