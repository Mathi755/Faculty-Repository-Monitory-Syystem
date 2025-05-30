import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

const Index = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX - window.innerWidth / 2) / 25,
        y: (e.clientY - window.innerHeight / 2) / 25
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 via-pink-800 to-orange-700 relative overflow-hidden">
      
      {/* Space gradient background with stars and nebula effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Deep space gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10" />
        
        {/* Nebula clouds */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-purple-500/20 via-pink-500/15 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-32 right-20 w-80 h-80 bg-gradient-to-tl from-blue-500/25 via-indigo-500/20 to-transparent rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-20 left-32 w-72 h-72 bg-gradient-to-tr from-orange-500/15 via-pink-500/10 to-transparent rounded-full blur-3xl animate-pulse delay-500" />
        
        {/* Stars */}
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite ${Math.random() * 2}s`,
            }}
          />
        ))}
        
        {/* Larger glowing stars */}
        {[...Array(8)].map((_, i) => (
          <div
            key={`glow-${i}`}
            className="absolute w-2 h-2 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              boxShadow: '0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.4)',
              animation: `gentleFloat ${4 + Math.random() * 3}s ease-in-out infinite ${Math.random() * 2}s`,
            }}
          />
        ))}
        
        {/* Light theme overlay */}
        <div className="absolute inset-0 bg-white/85 backdrop-blur-sm" />
      </div>

     

      {/* Main Content */}
      <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="text-center px-6 max-w-5xl mx-auto">
          
          {/* Main Title */}
          <div 
            className={`transition-all duration-1500 delay-500 ${
              isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
            style={{
              transform: `translateX(${mousePosition.x}px) translateY(${mousePosition.y}px)`
            }}
          >
            <h1 className="relative">
              {/* Main text with layered effect */}
              <span className="block text-7xl md:text-9xl font-black text-gray-900 mb-4 leading-none tracking-tight">
                <span className="relative inline-block">
                  <span className="absolute inset-0 text-blue-600/20 transform translate-x-2 translate-y-2">
                    Faculty
                  </span>
                  <span className="relative z-10 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Faculty
                  </span>
                </span>
              </span>
              
              <span className="block text-5xl md:text-7xl font-light text-blue-600 mb-2 tracking-wide">
                <span className="relative inline-block hover:scale-105 transition-transform duration-500">
                  Repository
                </span>
              </span>
              
              <span className="block text-4xl md:text-6xl font-medium text-gray-700 tracking-wider">
                <span className="relative inline-block">
                  <span className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 transform skew-x-12 -rotate-1"></span>
                  <span className="relative z-10">Management</span>
                </span>
              </span>
            </h1>
          </div>

          {/* Quote */}
          <div 
            className={`transition-all duration-2000 delay-1200 ${
              isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}
          >
            <blockquote className="mt-16 mb-12">
              <p className="text-xl md:text-2xl text-gray-600 font-light italic leading-relaxed max-w-3xl mx-auto">
                "Excellence in education begins with organized knowledge and efficient management of academic resources."
              </p>
              <footer className="mt-4 text-gray-500 font-medium">
                — Academic Excellence Initiative
              </footer>
            </blockquote>
          </div>

          {/* Call to Action */}
          <div 
            className={`transition-all duration-2500 delay-1800 ${
              isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
          >
            <Button 
             className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-2 rounded-lg transform transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg"
                onClick={() => window.location.href = '/auth'} >
              Access Repository
            </Button>
            
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes gentleFloat {
          0%, 100% { 
            transform: translateY(0px) translateX(0px); 
            opacity: 0.6;
          }
          50% { 
            transform: translateY(-15px) translateX(10px); 
            opacity: 1;
          }
        }
        
        @keyframes twinkle {
          0%, 100% { 
            opacity: 0.3;
            transform: scale(1);
          }
          50% { 
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
};

export default Index;