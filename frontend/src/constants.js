import { Dimensions } from "react-native";

export const API_BASE = "http://your-ip-address:8000";

export const { width: SW, height: SH } = Dimensions.get("window");

export const STEPS = [
  { key: "original", label: "Original", icon: "📷", color: "#4A9EFF" },
  { key: "canny", label: "Canny", icon: "⚡", color: "#FF6B35" },
  { key: "contours", label: "Contours", icon: "🔲", color: "#00D68F" },
  { key: "warped", label: "Warped", icon: "📐", color: "#B15DFF" },
  { key: "threshold", label: "Threshold", icon: "🔳", color: "#FFD700" },
];
