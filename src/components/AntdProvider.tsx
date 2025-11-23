"use client";

import { ConfigProvider } from "antd";
import { StyleProvider } from "@ant-design/cssinjs";
import { ReactNode } from "react";

export default function AntdProvider({ children }: { children: ReactNode }) {
  return (
    <StyleProvider hashPriority="high">
      <ConfigProvider>
        {children}
      </ConfigProvider>
    </StyleProvider>
  );
}

