import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useBlockchain } from "../../context/BlockchainProvider";
import styles from "./SyncStatus.module.css";
export function SyncStatus() {
    const { syncStatus, peerCount } = useBlockchain();
    const renderStatus = () => {
        switch (syncStatus) {
            case "synced":
                return _jsx("span", { className: styles.synced, children: "\uD83D\uDFE2 Synced" });
            case "syncing":
                return _jsx("span", { className: styles.syncing, children: "\u23F3 Syncing\u2026" });
            case "disconnected":
            default:
                return _jsx("span", { className: styles.disconnected, children: "\uD83D\uDD34 Disconnected" });
        }
    };
    return (_jsxs("div", { className: styles.statusWrapper, title: `Peers connected: ${peerCount}`, "aria-label": `Blockchain status: ${syncStatus}. Peers: ${peerCount}`, children: [renderStatus(), " ", peerCount !== undefined && (_jsxs("span", { className: styles.peerCount, children: ["(", peerCount, ")"] }))] }));
}
