'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";
import AppLayout from "@/components/layout/AppLayout";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useEffect, useMemo } from "react";
import { useUsers } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/context/AuthContext";

const UserCard = ({ user }: { user: User }) => {
    const router = useRouter();
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                    <Avatar>
                        <AvatarImage src={`/avatars/${user.id}.png`} />
                        <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="grid gap-1">
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                        aria-haspopup="true"
                        size="icon"
                        variant="ghost"
                        >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(`/admin/users/edit/${user.id}`)}>Edit User</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Copy User ID</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Role</span>
                    <Badge variant="outline">{user.role}</Badge>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>{user.status}</Badge>
                </div>
                <div className="space-y-2 pt-2 border-t">
                    <p className="text-muted-foreground">Store Access</p>
                    <div className="flex gap-1 flex-wrap">
                        {user.accessibleShopifyStores.length > 0 ? user.accessibleShopifyStores.map(store => (
                            <Badge key={store} variant="secondary">{store}</Badge>
                        )) : <span className="text-muted-foreground text-xs">No stores assigned.</span>}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function UsersPage() {
  const router = useRouter();
  const { users, loading: isLoading, error } = useUsers();
  const { user: currentUser } = useAuthContext();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const isOwner = currentUser?.role === 'Owner';

  useEffect(() => {
    if (error) {
        toast({
            title: "Error fetching users",
            description: error,
            variant: "destructive"
        });
    }
  }, [error, toast]);

  const visibleUsers = useMemo(() => {
    if (isOwner) return users;
    return users.filter(u => u.role !== 'Owner');
  }, [users, isOwner]);

  const renderSkeleton = (isMobileView: boolean) => {
    if (isMobileView) {
        return [...Array(3)].map((_, i) => (
            <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-1">
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                    <Skeleton className="h-8 w-8" />
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                </CardContent>
            </Card>
        ));
    }
    return [...Array(5)].map((_, i) => (
      <TableRow key={i}>
        <TableCell className="hidden sm:table-cell"><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
        <TableCell>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </TableCell>
        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
      </TableRow>
    ))
  };

  return (
    <AppLayout>
        <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back</span>
                    </Button>
                    <div className="grid gap-1">
                        <CardTitle>User Management</CardTitle>
                        <CardDescription>Manage team members, roles, and store access.</CardDescription>
                    </div>
                </div>
                <Button onClick={() => router.push('/admin/users/new')} size="sm" className="gap-1">
                    <PlusCircle className="h-4 w-4" />
                    Add User
                </Button>
            </div>
        </CardHeader>
        <CardContent>
             {isMobile ? (
                 <div className="space-y-4">
                    {isLoading ? renderSkeleton(true) : visibleUsers.map(user => <UserCard key={user.id} user={user} />)}
                </div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="hidden w-[100px] sm:table-cell">
                                <span className="sr-only">Avatar</span>
                            </TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="hidden sm:table-cell">
                                Store Access
                            </TableHead>
                            <TableHead className="hidden md:table-cell">
                                Created at
                            </TableHead>
                            <TableHead>
                                <span className="sr-only">Actions</span>
                            </TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {isLoading ? renderSkeleton(false) : visibleUsers.map(appUser => (
                            <TableRow key={appUser.id}>
                            <TableCell className="hidden sm:table-cell">
                                <Avatar>
                                    <AvatarImage src={`/avatars/${appUser.id}.png`} />
                                    <AvatarFallback>{appUser.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </TableCell>
                            <TableCell className="font-medium">
                                {appUser.name}
                                <div className="text-sm text-muted-foreground">{appUser.email}</div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline">{appUser.role}</Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                                <div className="flex gap-1 flex-wrap">
                                    {appUser.accessibleShopifyStores.map(store => (
                                        <Badge key={store} variant="secondary">{store}</Badge>
                                    ))}
                                </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                                {format(new Date(appUser.createdAt), "dd-MM-yy")}
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                    aria-haspopup="true"
                                    size="icon"
                                    variant="ghost"
                                    >
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => router.push(`/admin/users/edit/${appUser.id}`)}>Edit User</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>Copy User ID</DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </CardContent>
        </Card>
    </AppLayout>
  );
}
