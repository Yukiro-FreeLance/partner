import { ConnectionReport } from "../report";
export const metadata = { title: "Progress history" };
export default function Page() { return <ConnectionReport focus="history" />; }