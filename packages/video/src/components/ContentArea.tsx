// Positions template content inside the platform-safe zone, centered by default.
import type { CSSProperties, FC, ReactNode } from "react";
import { layout } from "../brand";

export const ContentArea: FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      position: "absolute",
      top: layout.contentTop,
      left: layout.contentLeft,
      width: layout.contentRight - layout.contentLeft,
      height: layout.contentBottom - layout.contentTop,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      ...style,
    }}
  >
    {children}
  </div>
);
