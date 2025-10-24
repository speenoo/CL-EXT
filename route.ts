import { NextRequest } from 'next/server';
import { auth } from '@workspace/auth';
import { prisma } from '@workspace/database/client';
import type { ExtensionAudienceDto } from '~/types/dtos/extension-audience-dto';

// Helper: CORS headers for extension consumption
function cors(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, { ...init, headers: { ...cors(), ...(init?.headers || {}) } });
}

// Map raw Prisma audience data to ExtensionAudienceDto
function mapToExtensionAudienceDto(audience: {
  id: string;
  name: string;
  description: string;
  linkedin: boolean;
  google: boolean;
  facebook: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ExtensionAudienceDto {
  return {
    id: audience.id,
    name: audience.name,
    description: audience.description,
    linkedin: audience.linkedin,
    google: audience.google,
    facebook: audience.facebook,
    createdAt: audience.createdAt,
    updatedAt: audience.updatedAt
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: cors() });
}

// POST: Cookie-based auth (extension calls with credentials: 'include')
// Extension passes organizationId in body
export async function POST(req: NextRequest) {
  try {
    // Check session cookie
    const session = await auth();
    if (!session?.user?.id) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json().catch(() => ({}));
    const organizationId: string | undefined = body.organizationId ?? undefined;

    console.log('Extension audiences POST called', { organizationId, userId });
    if (!organizationId) {
      return json({ error: 'organizationId is required' }, { status: 400 });
    }

    // Confirm user is a member of the organization
    const membership = await prisma.membership.findFirst({
      where: { userId, organizationId },
      select: { id: true }
    });
    if (!membership) {
      return json({ error: 'User not in organization' }, { status: 403 });
    }

    // Fetch all audiences for the organization
    const audiences = await prisma.audience.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        description: true,
        linkedin: true,
        google: true,
        facebook: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log('Extension audiences fetched', { organizationId, count: audiences.length });

    const audienceDtos: ExtensionAudienceDto[] = audiences.map(mapToExtensionAudienceDto);
    return json({ audiences: audienceDtos });
  } catch (error) {
    console.error('Extension audiences route error', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET variant: Cookie-based auth (extension calls with credentials: 'include')
// Extension passes organizationId as query param
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId') || undefined;

  try {
    // Check session cookie
    const session = await auth();
    if (!session?.user?.id) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    if (!organizationId) {
      return json({ error: 'organizationId is required' }, { status: 400 });
    }

    // Confirm user is a member of the organization
    const membership = await prisma.membership.findFirst({
      where: { userId, organizationId },
      select: { id: true }
    });
    if (!membership) {
      return json({ error: 'User not in organization' }, { status: 403 });
    }

    // Fetch all audiences for the organization
    const audiences = await prisma.audience.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        description: true,
        linkedin: true,
        google: true,
        facebook: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const audienceDtos: ExtensionAudienceDto[] = audiences.map(mapToExtensionAudienceDto);
    return json({ audiences: audienceDtos });
  } catch (e) {
    console.error('Extension audiences GET error', e);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}