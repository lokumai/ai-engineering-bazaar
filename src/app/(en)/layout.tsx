import { RootShell, shellMetadata } from '@/components/shell/RootShell'

/**
 * The root layout of the English tree. Three trees, three root layouts, one shell: `<html lang>`
 * has to be written by a root layout, and a route group (or a language's own folder)
 * is the one way the App Router gives a static export several of them. See
 * `RootShell` and D119.
 */
export const metadata = shellMetadata

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="en">{children}</RootShell>
}
