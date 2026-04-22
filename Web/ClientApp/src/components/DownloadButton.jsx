import React from "react";
import { DownloadButton2 } from "./DownloadButton2";

export default function DownloadButton(props) {
  return <DownloadButton2 {...props}>{props.children}</DownloadButton2>;
}
