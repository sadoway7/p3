import ApiConnectionTest from './ApiConnectionTest';

export default function DebugPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Debug Tools</h1>
      <ApiConnectionTest />
    </div>
  );
}