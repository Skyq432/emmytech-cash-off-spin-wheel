import type { Metadata } from "next";
import Emmy40Client from "./Emmy40Client";
import "./emmy40.css";

export const metadata: Metadata = {
  title: "EmmyTech Admin | Control Panel",
  description: "EmmyTech Spin & Save administration panel.",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default function Emmy40Page() {
  return <Emmy40Client />;
}
