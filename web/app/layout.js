// App shell (F1): skip link, header, main content area, footer.
import { Cinzel, Crimson_Text } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';

// Fantasy fonts: Cinzel for engraved headings, Crimson Text for readable "book" body text.
const cinzel = Cinzel({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-heading' });
const crimson = Crimson_Text({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-body' });

export const metadata = {
  title: 'GM Vault',
  description: 'Campaign manager for tabletop game masters and their players.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${cinzel.variable} ${crimson.variable}`}>
      <body>
        <a href="#main" className="skip-link">Skip to main content</a>
        <Header />
        <main id="main" className="container">
          {children}
        </main>
        <footer className="site-footer">
          <span className="footer-rule" aria-hidden="true">✦</span>
          Landon Stucki Bakeoff 2026
        </footer>
      </body>
    </html>
  );
}
