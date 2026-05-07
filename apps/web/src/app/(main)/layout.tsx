import { InstallPWABanner } from '@/features/shared/components/InstallPWABanner'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Nav, Sidebar, etc. */}
      <main>{children}</main>
      <InstallPWABanner />
    </div>
  )
}
