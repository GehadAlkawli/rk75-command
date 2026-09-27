import { listCreators } from '@/lib/streams';

export async function GET(request: Request) {
  const cached = new URL(request.url).searchParams.get('cached') === 'true';
  return Response.json(await listCreators(true, true, !cached));
}
