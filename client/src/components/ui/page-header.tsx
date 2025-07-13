import React from "react";

interface PageHeaderProps {
  heading: string;
  subheading?: string;
  children?: React.ReactNode;
}

export function PageHeader({ heading, subheading, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 pb-6">
      <h1 className="text-3xl font-bold tracking-tight">{heading}</h1>
      {subheading && (
        <p className="text-lg text-muted-foreground">{subheading}</p>
      )}
      {children}
    </div>
  );
}