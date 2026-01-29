# Smart Canteen System - PPT Design & Script

> **Theme**: Tech-Forward, Clean, Impactful.
> **Visual Style**: Apple-style minimalism or Deep Tech (Dark background, glowing accents). High-quality imagery of food and data visualization.

---

## Slide 1: The Vision

**Layout**:

- **Background**: Full-screen high-quality photo of a modern, clean cafeteria line, slightly darkened.
- **Center**: Large, bold typography: "Smart Canteen" (White).
- **Subtitle**: "Revolutionizing Dining with Visual Intelligence" (Light Grey).
- **Bottom**: Presenter Name / Date (Small).

**Script**:
"大家好。今天主要想和大家分享的，是我们正在构建的‘智慧食堂’系统。我们常说‘民以食为天’，但在这个最古老的行业里，其实正发生着一场静悄悄的数字化革命。这不仅仅是一个结算系统，更是我们要讲述的，关于‘看见’食物的故事。"

---

## Slide 2: The Visible Problem

**Layout**:

- **Split Screen**:
  - **Left (60%)**: A shocking statistic or image about food waste (e.g., a mountain of wasted food or a bold number "30%").
  - **Right (40%)**: Minimal text: "Inefficiency", "Waste", "Unknown Data".
  - **Design Note**: Use red/orange accent colors to signal urgency.

**Script**:
"在传统的食堂场景中，我们面临着两个巨大的黑盒。第一，是效率的黑盒，排队、拥堵、人工结算慢；第二，是数据的黑盒，我们每天产出多少剩菜？学生或员工到底喜欢吃什么？这些数据往往是随着餐厨垃圾一起被倒掉的。我们不仅浪费了粮食，更浪费了优化服务的机会。"

---

## Slide 3: The Solution - The "Digital Eye"

**Layout**:

- **Hero Image**: A close-up, high-tech rendering of a camera lens focusing on a dinner plate.
- **Overlay**: A bounding box (green) detecting a specific dish (e.g., "Kung Pao Chicken").
- **Text**: "See. Recognize. Analyze."

**Script**:
"为了打开这一个个黑盒，我们打造了这套基于计算机视觉的智能结算与分析系统。简单来说，我们赋予了结算台一双‘慧眼’。它不需要芯片碗，不需要人工干预，只需要安装一个摄像头，就能在毫秒级别‘看’懂盘子里装的是什么。"

---

## Slide 4: User Journey - Seamless Experience

**Layout**:

- **Flowchart / 3 Interconnected Icons**:
  1.  **Place Tray** (Icon of a tray)
  2.  **Instant Scan** (Icon of a scanner/eye)
  3.  **Done** (Checkmark)
- **Animation**: A light beam flowing from left to right connecting them.

**Script**:
"对于用户而言，这是一次‘无感’的体验。我们追求的是极致的简单：放置餐盘，系统自动识别，拿走即走。没有繁琐的刷卡动作，没有人工点数的等待。科技在这里隐形了，但服务却变得更快了。"

---

## Slide 5: Under the Hood - Dual-Core Intelligence

**Layout**:

- **Diagram**: Two "Brain" chips or nodes connecting to form a central processor.
  - **Node A**: Label "YOLOv8" (Speed & Naming).
  - **Node B**: Label "SAM (Segment Anything)" (Precision & Area).
- **Visual**: A plate of food where YOLO draws a box around the chicken, and SAM perfectly outlines the jagged edges of the sauce.

**Script**:
"那么，这背后的魔法是什么？我们在技术架构上采用了‘双核驱动’。
首先，我们使用 **YOLOv8** 模型，它像一个经验丰富的快手厨师，能瞬间叫出每一道菜的名字，速度极快。
但仅有名字不够，我们还引入了 Meta 的 **SAM (Segment Anything Model)**。它像一个精细的测量师，能精确勾勒出食物的每一个边缘，哪怕是一粒米、一片菜叶。这种‘速度+精度’的组合，是我们技术的核心壁垒。"

---

## Slide 6: Deep Tech - ROI & Calibration

**Layout**:

- **Technical Schematic**: Wireframe view of a tray.
- **Highlights**: Show the "Region of Interest (ROI)" grids lighting up in Green.
- **Label**: "Dynamic Plate Calibration".
- **Screenshot**: Use a real screenshot from `calibrate_plate.py` showing the alignment lines.

**Script**:
"在真实场景中，餐盘的摆放千奇百怪。为了保证识别的绝对准确，我们研发了动态校准算法。大家看这张图，系统会根据预设的‘餐盘模板’，自动锁定每一个格子的位置。无论你怎么放，系统都能通过坐标变换，把不规则的画面‘拉正’，确保把红烧肉算在红烧肉的格子里，而不是误判给旁边的米饭。"

---

## Slide 7: The "Leftover" Breaktrough

**Layout**:

- **Before/After Comparison**:
  - **Left**: Full Plate (100%).
  - **Right**: Eaten Plate (Label: "Leftover Ratio: 12.5%").
- **Visual**: Show a heat map or mask overlay on the leftover food.
- **Key Metric**: "Pixel-Level Accuracy".

**Script**:
"这是我们最引以为傲的功能——‘剩菜量化分析’。传统的系统只能告诉你‘卖了什么’，我们能告诉你‘剩了什么’。通过计算食物区域的像素覆盖率，我们能精确得出：这盘青菜剩了 30%，那份米饭几乎没动。这不再是模糊的估算，而是像素级的数据洞察。"

---

## Slide 8: The Dashboard - Data to Wisdom

**Layout**:

- **UI Showcase**: A clear mockup of the Dashboard (React/Modern UI).
- **Widgets**: "Wait Time Analysis", "Popular Dishes", "Waste Trends".
- **Screen**: Show the actual frontend code result or a high-fidelity mockup.

**Script**:
"所有这些识别结果，最终汇聚成了这个决策驾驶舱。大屏上实时跳动的不仅仅是数字，而是食堂的脉搏。后勤管理者一眼就能看到：哪个窗口排队长？哪道菜今天剩得最多？从而反向指导采购和备餐。从‘经验主义’走向‘数据主义’，这就是智慧食堂的价值闭环。"

---

## Slide 9: Future Roadmap

**Layout**:

- **Timeline/Roadmap**:
  - **Now**: Visual Recognition & Waste Analysis.
  - **Next**: Personalized Nutrition Advice.
  - **Future**: Supply Chain Automation.
- **Visual**: Icons representing Health, Logistics, AI.

**Script**:
"今天的演示只是起点。未来，我们将把这个系统延伸到更多维度。比如，结合个人健康数据的营养建议，或者直接对接供应链的自动补货。我们的目标，是用视觉技术，让每一粒粮食都被善待，让每一顿饭都更智慧。"

---

## Slide 10: Closing

**Layout**:

- **Simple**: "Thank You".
- **Contact Info**: QR Code / Email.
- **Background**: Fade to black or white with subtle logo.

**Script**:
"感谢大家的聆听。这就是我们正在构建的，看得见未来的智慧食堂。谢谢。"
