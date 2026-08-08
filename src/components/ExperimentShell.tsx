import { ExperimentSidebar } from "./ExperimentSidebar";
import styles from "./ExperimentShell.module.css";

type ExperimentShellProps = {
  children: React.ReactNode;
  sidebarBasePath?: string;
};

export function ExperimentShell({
  children,
  sidebarBasePath = "",
}: ExperimentShellProps) {
  return (
    <div className={styles.appShell}>
      <ExperimentSidebar basePath={sidebarBasePath} />
      <div className={styles.experimentContent}>{children}</div>
    </div>
  );
}
