import { type ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-caribbean-black via-gray-900 to-caribbean-black">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-caribbean-green to-caribbean-gold bg-clip-text text-transparent">
            JHB Command Center
          </h1>
          <p className="text-gray-400 mt-2">Jamaica House Brand LLC</p>
        </div>
        {children}
      </div>
    </div>
  );
}
