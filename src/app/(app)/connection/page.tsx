import { ConnectionReport } from "./report";

export const metadata = { title: "Our connection" };

export default function Page() {
  return <ConnectionReport focus="overview" />;
}
