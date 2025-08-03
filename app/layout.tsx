import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SDScooter - İşletme Yönetimi',
  description: 'Elektrikli scooter dükkanı için gelişmiş gelir-gider takip uygulaması',
  icons: {
    icon: '/favicon.svg',
  },
  manifest: '/manifest.json',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1e293b',
  colorScheme: 'dark',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `

              const preloadLinks = [
                { href: '/api/dashboard', as: 'fetch' }
              ];
              
              preloadLinks.forEach(link => {
                const linkElement = document.createElement('link');
                linkElement.rel = 'preload';
                linkElement.href = link.href;
                linkElement.as = link.as;
                linkElement.crossOrigin = 'anonymous';
                document.head.appendChild(linkElement);
              });
              

              window.addEventListener('error', (e) => {
                console.error('Global error:', e.error);
              });
              
              window.addEventListener('unhandledrejection', (e) => {
                console.error('Unhandled promise rejection:', e.reason);
              });
            `,
          }}
        />
      </head>
      <body className={`${inter.className} layout-body antialiased`}>
        <Providers>
          <div className="min-h-screen relative overflow-hidden">

            <div className="fixed inset-0 z-0">

              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-indigo-600/10 animate-pulse"></div>
              <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-radial from-blue-500/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-gradient-radial from-purple-500/20 to-transparent rounded-full blur-3xl animate-pulse bg-anim-delay-1"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-indigo-500/10 to-transparent rounded-full blur-3xl animate-pulse bg-anim-delay-2"></div>
            </div>
            

            <div className="relative z-10">
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}