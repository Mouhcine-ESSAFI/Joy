'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useFormContext } from 'react-hook-form';

const ALL_RESOURCES = [
  {
    category: 'Orders & Operations',
    resources: [
      { key: 'orders', label: 'Orders', description: 'View and manage tour orders' },
      { key: 'order_notes', label: 'Order Notes', description: 'Add/edit operational notes' },
      { key: 'order_supplements', label: 'Supplements', description: 'Add/remove order supplements' },
      { key: 'order_history', label: 'Order History', description: 'View order change history' },
    ],
  },
  {
    category: 'Users & Access',
    resources: [
      { key: 'users', label: 'Users', description: 'Manage user accounts' },
      { key: 'roles', label: 'Roles', description: 'Manage roles and permissions' },
    ],
  },
  {
    category: 'Configuration',
    resources: [
      { key: 'stores', label: 'Stores', description: 'Manage Shopify store connections' },
      { key: 'tour_codes', label: 'Tour Codes', description: 'Map products to tour codes' },
      { key: 'room_types', label: 'Room Types', description: 'Manage room type rules' },
      { key: 'transport_types', label: 'Transport', description: 'Manage transport companies' },
    ],
  },
  {
    category: 'Finance',
    resources: [
      { key: 'invoices', label: 'Invoices', description: 'Generate and manage invoices' },
      { key: 'payments', label: 'Payments', description: 'Track payments and refunds' },
      { key: 'reports', label: 'Reports', description: 'Financial and operational reports' },
    ],
  },
];

const ACTIONS = [
  { key: 'create', label: 'Create', color: 'bg-green-100 text-green-800' },
  { key: 'read', label: 'Read', color: 'bg-blue-100 text-blue-800' },
  { key: 'update', label: 'Update', color: 'bg-yellow-100 text-yellow-800' },
  { key: 'delete', label: 'Delete', color: 'bg-red-100 text-red-800' },
];

export default function PermissionsForm({ allowedKeys }: { allowedKeys: string[] }) {
  const { getValues, setValue } = useFormContext();
  // We use a dummy state to force re-render when a parent 'select all' or 'clear' is clicked.
  const [_, setRender] = useState(0); 

  const permissions = getValues('permissions') || {};

  const filteredResources = ALL_RESOURCES.map(category => ({
    ...category,
    resources: category.resources.filter(resource => allowedKeys.includes(resource.key))
  })).filter(category => category.resources.length > 0);


  const hasPermission = (resource: string, action: string) => {
    return permissions?.[resource]?.[action] || false;
  };

  const togglePermission = (resource: string, action: string) => {
    const currentVal = hasPermission(resource, action);
    setValue(`permissions.${resource}.${action}`, !currentVal, { shouldDirty: true });
    setRender(Math.random());
  };

  const toggleAllActions = (resource: string, enable: boolean) => {
    const newResourcePermissions = {
        create: enable,
        read: enable,
        update: enable,
        delete: enable,
    };
    setValue(`permissions.${resource}`, newResourcePermissions, { shouldDirty: true });
    setRender(Math.random());
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissions</CardTitle>
        <CardDescription>
          Configure granular permissions for this role
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {filteredResources.length === 0 ? (
           <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">This role does not have any configurable permissions.</p>
          </div>
        ) : (
          filteredResources.map((category) => (
            <div key={category.category} className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{category.category}</h3>
                <Separator className="mt-2" />
              </div>

              {category.resources.map((resource) => (
                <div
                  key={resource.key}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">
                        {resource.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {resource.description}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => toggleAllActions(resource.key, true)}
                      >
                        Select All
                      </Badge>
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => toggleAllActions(resource.key, false)}
                      >
                        Clear
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {ACTIONS.map((action) => (
                      <div
                        key={action.key}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`${resource.key}-${action.key}`}
                          checked={hasPermission(resource.key, action.key)}
                          onCheckedChange={() =>
                            togglePermission(resource.key, action.key)
                          }
                        />
                        <Label
                          htmlFor={`${resource.key}-${action.key}`}
                          className="cursor-pointer"
                        >
                          <Badge variant="secondary" className={`${action.color} hover:${action.color}`}>
                            {action.label}
                          </Badge>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}

        {/* Permission Summary */}
        <div className="rounded-lg bg-muted p-4">
          <strong className="text-sm">Permissions Summary:</strong>
          <p className="text-sm text-muted-foreground mt-1">
            {Object.keys(permissions).length === 0
              ? 'No permissions selected'
              : `${Object.keys(permissions).length} resources configured with ${
                  Object.values(permissions).flatMap(p => Object.values(p as object)).filter(v => v).length
                } total permissions`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
