
import "./globals.css"; import type {Metadata} from "next";
export const metadata:Metadata={title:"Conversation Autopsy — Votre histoire, décodée.",description:"L'autopsie de vos conversations par Jean-Michel."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr"><body>{children}</body></html>}
