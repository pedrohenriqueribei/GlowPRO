import type { Metadata } from 'next';
import { Inter, Space_Grotesk, Playfair_Display, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/auth-context';
import AdminBootstrap from '@/components/AdminBootstrap';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
});

const cormorant = Cormorant_Garamond({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: 'GlowPRO - Gestão para Salões e Barbearias',
  description: 'Plataforma profissional de gerenciamento para salões de beleza e barbearias.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${spaceGrotesk.variable} ${playfair.variable} ${cormorant.variable}`}>
      <body suppressHydrationWarning className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
        <AuthProvider>
          <AdminBootstrap />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
