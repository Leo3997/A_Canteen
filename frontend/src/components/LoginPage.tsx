import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight } from "lucide-react";
import { GridBackground, TextReveal, Magnetic } from "@/components/ui/animated-components";
import { motion } from "framer-motion";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [activeInput, setActiveInput] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    setTimeout(() => {
      if (username === "admin" && password === "123456") {
        onLoginSuccess();
      } else {
        alert("Authentication Failed (Try: admin / 123456)");
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="w-full h-screen flex overflow-hidden bg-white text-black font-sans selection:bg-black selection:text-white">
      {/* Left: Visual Area (60%) */}
      <div className="hidden lg:flex lg:w-[60%] relative bg-black items-center justify-center overflow-hidden">
        {/* Animated Grid Background */}
        <GridBackground />

        {/* Artistic Background Image - Full Color (Subtle Blend) */}
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none">
             <img
              src="https://images.unsplash.com/photo-1543353071-873f17a7a088?q=80&w=2070&auto=format&fit=crop"
              alt="Minimalist Food Texture"
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-[60s] ease-linear"
            />
        </div>
        
        {/* Content Box */}
        <div className="relative z-20 max-w-xl p-12 text-white">
           <div className="mb-12 border-l-4 border-white pl-8 py-2">
              <h2 className="text-6xl font-black tracking-tighter leading-tight mb-4 overflow-hidden">
                <TextReveal text="未来 已至." delay={0.2} />
              </h2>
              <div className="text-xl font-light tracking-widest uppercase opacity-80">
                <TextReveal text="智能 视觉 系统" delay={0.8} />
              </div>
           </div>

           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 0.9, y: 0 }}
             transition={{ delay: 1.5, duration: 0.8 }}
             className="flex items-center gap-4 group cursor-default"
           >
              <div className="p-3 bg-white text-black rounded-full rotate-12 group-hover:rotate-0 transition-transform duration-500">
                <img src="/logo-transparent.png" alt="Logo" className="w-8 h-8 object-contain invert grayscale" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-widest">得鹿山智能食堂</p>
                <p className="text-[10px] font-mono opacity-60">v2.0.4 / STABLE</p>
              </div>
           </motion.div>
        </div>
      </div>

      {/* Right: Login Form (40%) */}
      <div className="w-full lg:w-[40%] flex flex-col items-center justify-center p-8 lg:p-16 relative">
         <div className="w-full max-w-sm space-y-10">
            
            {/* Header */}
            <div className="space-y-2">
               <h1 className="text-4xl font-bold tracking-tight">Login.</h1>
               <p className="text-neutral-500 text-sm">Enter your credentials to access the console.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-6">
                <div className="group relative">
                  <Input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setActiveInput('username')}
                    onBlur={() => setActiveInput(null)}
                    className="h-12 border-0 border-b-2 border-neutral-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-black transition-all bg-transparent text-lg placeholder:text-transparent"
                    placeholder="Username"
                  />
                  <Label 
                    htmlFor="username" 
                    className={`absolute left-0 transition-all duration-300 pointer-events-none ${
                      activeInput === 'username' || username ? '-top-3 text-xs font-bold text-black' : 'top-3 text-neutral-400 font-medium'
                    }`}
                  >
                    USERNAME
                  </Label>
                </div>

                <div className="group relative">
                   <Input 
                    id="password" 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setActiveInput('password')}
                    onBlur={() => setActiveInput(null)}
                    className="h-12 border-0 border-b-2 border-neutral-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-black transition-all bg-transparent text-lg placeholder:text-transparent font-mono tracking-widest"
                    placeholder="Password"
                  />
                   <Label 
                    htmlFor="password" 
                    className={`absolute left-0 transition-all duration-300 pointer-events-none ${
                      activeInput === 'password' || password ? '-top-3 text-xs font-bold text-black' : 'top-3 text-neutral-400 font-medium'
                    }`}
                  >
                    PASSWORD
                  </Label>
                </div>
              </div>

              <div className="pt-4">
                <Magnetic distance={0.1}>
                  <Button 
                    type="submit" 
                    className="w-full h-14 bg-black text-white hover:bg-neutral-800 rounded-none text-sm font-bold tracking-widest uppercase transition-all flex items-center justify-between px-6 group"
                    disabled={loading}
                  >
                    <span>{loading ? "OFFICIER..." : "Authenticate"}</span>
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    )}
                  </Button>
                </Magnetic>
              </div>
            </form>

            <div className="text-center">
               <a href="#" className="text-xs text-neutral-400 hover:text-black underline underline-offset-4 decoration-neutral-300 hover:decoration-black transition-all">
                 Forgot password?
               </a>
            </div>
         </div>

         {/* Footer */}
         <div className="absolute bottom-6 w-full text-center">
            <p className="text-[10px] text-neutral-300 uppercase tracking-widest font-black">
              Smart Canteen Design System
            </p>
         </div>
      </div>
    </div>
  );
}
