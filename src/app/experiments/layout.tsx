import { ExperimentShell } from "@/components/ExperimentShell";

export default function ExperimentsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ExperimentShell sidebarBasePath="/experiments">{children}</ExperimentShell>;
}
