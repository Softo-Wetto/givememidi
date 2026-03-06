import "./globals.css";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { AuthProvider } from "./components/AuthProvider";
import { PageTransition } from "./components/PageTransition";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <AuthProvider>
          <Header />
          <PageTransition>{children}</PageTransition>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}