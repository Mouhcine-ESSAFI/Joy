'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import UserForm from './UserForm';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';


export default function NewUserPage() {
  const router = useRouter();
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
                <CardTitle>Create New User</CardTitle>
                <CardDescription>Fill out the form below to add a new team member.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <UserForm />
        </CardContent>
        </Card>
    </AppLayout>
  );
}
