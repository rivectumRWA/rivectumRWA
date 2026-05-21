import { Providers } from "./providers";
import type { ReactNode } from "react";

export const metadata = { title: "Agent RWA Vault" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
