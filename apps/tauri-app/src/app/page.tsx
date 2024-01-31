import dynamic from "next/dynamic";

const PromptsGrid = dynamic(() => import("./_components/PromptsGrid"), {
  ssr: false,
});

export default function HomePage() {
  return <PromptsGrid />;
}
