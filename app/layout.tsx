
import "./globals.css"; import type {Metadata} from "next";
export const metadata:Metadata={title:"Couple AI — Votre histoire, décodée.",description:"Une autopsie narrative et factuelle de votre conversation de couple."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr"><body>{children}</body></html>}
