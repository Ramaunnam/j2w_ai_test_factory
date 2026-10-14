import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/primitives'
import type { RequirementId } from '@/lib/types'

export function PageHeader({
  title,
  description,
  requirements = [],
  actions,
  children,
}: {
  title: string
  description: ReactNode
  requirements?: RequirementId[] | string[]
  actions?: ReactNode
  children?: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-text">{title}</h1>
            {requirements.map((req) => (
              <Badge
                key={req}
                tone="primary"
                className="cursor-pointer"
                title={`Show what proves ${req}`}
                onClick={() => navigate(`/coverage?req=${req}`)}
              >
                {req}
              </Badge>
            ))}
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  )
}
