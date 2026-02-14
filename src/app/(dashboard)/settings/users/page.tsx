import { verifyAdmin } from '@/lib/dal';
import { db } from '@/lib/db';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RoleBadge } from '@/components/dashboard/RoleBadge';
import { InviteUserForm } from '@/components/settings/InviteUserForm';
import { formatDistanceToNow, format } from 'date-fns';

export default async function UsersPage() {
  await verifyAdmin();

  // Fetch all users
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Fetch pending invites
  const pendingInvites = await db.inviteToken.findMany({
    where: {
      acceptedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage users and send invitations
        </p>
      </div>

      {/* Current Users */}
      <Card>
        <CardHeader>
          <CardTitle>Current Users</CardTitle>
          <CardDescription>
            All active and inactive users in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          user.isActive
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-50 text-gray-700'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(user.createdAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Invite New User */}
      <Card>
        <CardHeader>
          <CardTitle>Invite New User</CardTitle>
          <CardDescription>
            Send an invitation to a new user with a pre-assigned role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteUserForm />
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invites</CardTitle>
            <CardDescription>
              Invitations that have been sent but not yet accepted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4"
                >
                  <div className="flex-1">
                    <p className="font-medium">{invite.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <RoleBadge role={invite.role} />
                      <span className="text-sm text-muted-foreground">
                        Sent {formatDistanceToNow(new Date(invite.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Expires {format(new Date(invite.expiresAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
