import type { Category, CategoryName } from '@/lib/types'
import { CATEGORY_BAR_COLORS } from '@/lib/types'

interface CategoryBarProps {
  categories: Category[]
}

export function CategoryBar({ categories }: CategoryBarProps) {
  return (
    <div className="flex h-[5px] gap-0.5 rounded-full overflow-hidden">
      {categories.map((cat) => (
        <div
          key={cat.name}
          className="h-full rounded-full transition-all duration-250 ease-out"
          style={{
            width: `${cat.percentage}%`,
            backgroundColor: CATEGORY_BAR_COLORS[cat.name as CategoryName],
          }}
        />
      ))}
    </div>
  )
}
