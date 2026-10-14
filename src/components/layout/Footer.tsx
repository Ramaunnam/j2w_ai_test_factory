import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-2xs text-muted">
        <p className="font-medium">J2W · POC – mock data for demonstration</p>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/coverage" className="link text-2xs">
            Requirement coverage R1–R10
          </Link>
          <Link to="/delivery" className="link text-2xs">
            Build → Run → Hand over
          </Link>
          <span className="inline-flex items-center gap-1">
            <Info className="h-3 w-3" aria-hidden />
            No real personal data, no client names
          </span>
        </div>
      </div>
    </footer>
  )
}
