'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useParams, useRouter } from 'next/navigation';
import UserForm from '../../new/UserForm';
import AppLayout from '@/components/layout/AppLayout';
import { useEffect, useState } from 'react';
import type { User } from '@/lib/types';
import api from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function EditUserPage() {
  const { userId } = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    api.users.getById(userId as string).then(foundUser => {
      setUser(foundUser);
      setIsLoading(false);
    });
  }, [userId])

  const renderSkeleton = () => (
      <div className="space-y-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
  );
  
  return (
    <AppLayout>
        <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Back</span>
              </Button>
              <div className="grid gap-1">
                  <CardTitle>Edit User</CardTitle>
                  {isLoading ? (
                      <Skeleton className="h-5 w-48 mt-1.5" />
                    ) : (
                      <CardDescription>
                          {`Editing profile for ${user?.name}`}
                      </CardDescription>
                  )}
              </div>
          </div>
        </CardHeader>
        <CardContent>
            {isLoading ? renderSkeleton() : user ? <UserForm user={user} userId={userId as string} /> : <p>User not found.</p>}
        </CardContent>
        </Card>
    </AppLayout>
  );
}
