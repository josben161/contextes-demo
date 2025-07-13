import SplitDemo from '@/components/SplitDemo';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-3xl font-bold">Baseline vs Context ES</h1>
      <SplitDemo />
    </main>
  );
}
