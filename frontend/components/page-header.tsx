export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 sm:items-start">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-normal text-foreground">
          {title}
        </h1>
        <p className="mt-1 hidden text-sm text-muted-foreground sm:block">{description}</p>
      </div>
      {actions}
    </div>
  );
}
