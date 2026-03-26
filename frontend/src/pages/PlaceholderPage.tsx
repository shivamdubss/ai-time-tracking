interface PlaceholderPageProps {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
      <h2 className="font-display font-bold text-2xl text-text-primary mb-2">{title}</h2>
      <p className="text-sm text-text-muted max-w-[360px]">{description}</p>
    </div>
  )
}
