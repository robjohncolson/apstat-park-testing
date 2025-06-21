import { useBlockchain } from "../../context/BlockchainProvider";
import styles from "./SyncStatus.module.css";

export function SyncStatus() {
  const { syncStatus, peerCount } = useBlockchain();

  const renderStatus = () => {
    switch (syncStatus) {
      case "synced":
        return <span className={styles.synced}>🟢 Synced</span>;
      case "syncing":
        return <span className={styles.syncing}>⏳ Syncing…</span>;
      case "disconnected":
      default:
        return <span className={styles.disconnected}>🔴 Disconnected</span>;
    }
  };

  return (
    <div className={styles.statusWrapper} title={`Peers connected: ${peerCount}`}
      aria-label={`Blockchain status: ${syncStatus}. Peers: ${peerCount}`}
    >
      {renderStatus()} {peerCount !== undefined && (
        <span className={styles.peerCount}>({peerCount})</span>
      )}
    </div>
  );
} 