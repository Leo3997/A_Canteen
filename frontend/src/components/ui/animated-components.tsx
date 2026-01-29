
import React, { useRef, useState, useEffect } from "react";
import { motion, useMotionValue, useMotionTemplate } from "framer-motion";
import type { Variants } from "framer-motion";
import { cn } from "@/lib/utils";

// --- 1. Spotlight Card (Dashboard) ---
export const SpotlightCard = ({ children, className = "", spotlightColor = "rgba(16, 185, 129, 0.25)" }: { children: React.ReactNode, className?: string, spotlightColor?: string }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      className={cn(
        "group relative border border-neutral-200 bg-white shadow-sm overflow-hidden",
        className
      )}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              ${spotlightColor},
              transparent 80%
            )
          `,
        }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
};

// --- 2. Grid Background (Login Page) ---
export const GridBackground = () => {
    return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            {/* 动态网格线 */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
            
            {/* 浮动粒子 */}
            <Particles className="absolute inset-0" quantity={30} />
            
            {/* 顶部光晕 */}
            <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-emerald-500 opacity-20 blur-[100px]"></div>
        </div>
    );
};

// --- 2.1 Particles Sub-component ---
const Particles = ({ className = "", quantity = 30 }: { className?: string, quantity?: number }) => {
    const [particles, setParticles] = useState<any[]>([]);

    useEffect(() => {
        const newParticles = [];
        for (let i = 0; i < quantity; i++) {
            newParticles.push({
                x: Math.random() * 100,
                y: Math.random() * 100,
                duration: Math.random() * 20 + 10,
                delay: Math.random() * 10,
            });
        }
        setParticles(newParticles);
    }, [quantity]);

    return (
        <div className={className}>
            {particles.map((p, i) => (
                <motion.div
                    key={i}
                    className="absolute bg-white rounded-full opacity-20"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: Math.random() * 3 + 1 + "px",
                        height: Math.random() * 3 + 1 + "px",
                    }}
                    animate={{
                        y: [0, -100],
                        opacity: [0, 0.5, 0],
                    }}
                    transition={{
                        duration: p.duration,
                        repeat: Infinity,
                        delay: p.delay,
                        ease: "linear",
                    }}
                />
            ))}
        </div>
    );
};


// --- 3. Text Reveal (Login Page) ---
export const TextReveal = ({ text, className = "", delay = 0 }: { text: string, className?: string, delay?: number }) => {
  const words = text.split(" ");

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: (i: number = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.04 * i + delay },
    }),
  };

  const child: Variants = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
  };

  return (
    <motion.div
      style={{ overflow: "hidden", display: "flex", flexWrap: "wrap" }}
      variants={container}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {words.map((word, index) => (
        <motion.span variants={child} style={{ marginRight: "0.25em" }} key={index}>
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
};

// --- 4. Magnetic Wrapper (Sidebar/Buttons) ---
export const Magnetic = ({ children, distance = 0.5 }: { children: React.ReactNode, distance?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current!.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    x.set(middleX * distance);
    y.set(middleY * distance);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x, y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
    >
      {children}
    </motion.div>
  );
};

// --- 5. Blur Reveal (Section Headings) ---
export const BlurReveal = ({ children, className = "", delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => {
  return (
    <motion.div
      initial={{ filter: "blur(10px)", opacity: 0, y: 10 }}
      animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// --- 6. Click Spark (Visual Feedback) ---
export const ClickSpark = () => {
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const id = Date.now();
      setSparks((prev) => [...prev, { id, x: e.clientX, y: e.clientY }]);
      setTimeout(() => {
        setSparks((prev) => prev.filter((s) => s.id !== id));
      }, 600);
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999]">
      {sparks.map((spark) => (
        <Spark key={spark.id} x={spark.x} y={spark.y} />
      ))}
    </div>
  );
};

const Spark = ({ x, y }: { x: number; y: number }) => {
  const particles = Array.from({ length: 8 });
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-4 bg-emerald-500 rounded-full"
          initial={{ rotate: i * 45, x: 0, opacity: 1 }}
          animate={{ x: 40, opacity: 0, scale: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      ))}
    </div>
  );
};

// --- 7. Count Up (Numbers) ---
export const CountUp = ({ to, from = 0, duration = 2, decimals = 0 }: { to: number, from?: number, duration?: number, decimals?: number }) => {
  const [count, setCount] = useState(from);
  
  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      const current = progress * (to - from) + from;
      setCount(current);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [to, from, duration]);

  return <span>{count.toFixed(decimals).toLocaleString()}</span>;
};

// --- 8. Shiny Text (Badges/Labels) ---
export const ShinyText = ({ text, disabled = false, speed = 5, className = "" }: { text: string, disabled?: boolean, speed?: number, className?: string }) => {
  const animationDuration = `${speed}s`;

  return (
    <span
      className={cn(
        "text-[#b5b5b5a4] bg-clip-text inline-block",
        disabled ? "" : "animate-shiny-text",
        className
      )}
      style={{
        backgroundImage: "linear-gradient(120deg, rgba(255, 255, 255, 0) 40%, rgba(255, 255, 255, 0.8) 50%, rgba(255, 255, 255, 0) 60%)",
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: "text",
        animationDuration: animationDuration,
      }}
    >
      {text}
    </span>
  );
};

// --- 9. Tilted Card (Image Showcase) ---
export const TiltedCard = ({ children, className = "", onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const rotateX = ((mouseY - height / 2) / (height / 2)) * -10;
    const rotateY = ((mouseX - width / 2) / (width / 2)) * 10;

    x.set(rotateX);
    y.set(rotateY);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{ rotateX: x, rotateY: y, transformStyle: "preserve-3d" }}
      transition={{ type: "spring", stiffness: 150, damping: 20 }}
      className={cn("relative transition-all duration-200 ease-out", className)}
    >
      <div className="h-full w-full" style={{ transform: "translateZ(50px)", transformStyle: "preserve-3d" }}>
        {children}
      </div>
    </motion.div>
  );
};

// --- 10. Fuzzy Overlay (Premium Texture) ---
export const FuzzyOverlay = () => {
    return (
        <div className="pointer-events-none fixed inset-0 z-[100] opacity-[0.03] mix-blend-overlay">
            <div className="h-full w-full bg-[url('https://www.transparenttextures.com/patterns/noise.png')]"></div>
        </div>
    );
};

