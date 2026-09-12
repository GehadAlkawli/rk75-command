import { listCreators } from '@/lib/streams';

export async function GET() {
  return Response.json(await listCreators(true));
}
