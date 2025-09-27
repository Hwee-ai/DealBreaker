// app/page.tsx
export default function Home() {
 return (
   <main className="p-10 space-y-6">
    <h1 className="text-2xl font-bold">Welcome</h1>
    <div className="space-x-3">
     <a className="underline" href="/api/auth/login?provider=singpass">Login with Singpass</a>
     <a className="underline" href="/api/auth/login?provider=techpass">Login with TechPass</a>
    </div>
   </main>
  );
}