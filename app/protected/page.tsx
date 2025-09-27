// app/protected/page.tsx
import { getSession } from '@/lib/session';


export default async function Protected() {
 const sess = await getSession();
 return (
   <main className="p-10 space-y-6">
     <h1 className="text-2xl font-bold">Protected</h1>
     <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(sess, null, 2)}</pre>
   </main>
 );
}