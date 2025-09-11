import ProductionTimelineV2 from '../components/foresight-production-timeline-v2';

export default function Page({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  return (
    <main>
      <ProductionTimelineV2 
        searchParams={searchParams ?? {}} 
      />
    </main>
  );
}