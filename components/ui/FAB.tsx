"use client";

import Icon from "./Icon";

export default function FAB({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Post a swap"
      style={{ position: "fixed", bottom: 76, right: 20, zIndex: 199, width: 56, height: 56, borderRadius: "50%", border: "none", cursor: "pointer", background: "linear-gradient(135deg,#AD1B27,#AD1B27dd)", color: "#1A1F4D", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(173,27,39,.4)" }}
    >
      <Icon n="plus" s={24} c="#1A1F4D" />
    </button>
  );
}
