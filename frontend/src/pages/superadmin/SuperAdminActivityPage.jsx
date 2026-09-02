import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { LoadingState } from '../../components/common/LoadingState';
import { superAdminService } from '../../services/superAdminService';
import { formatDate } from '../../utils/formatters';
import { Activity, ShieldAlert, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export const SuperAdminActivityPage = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      try {
        const data = await superAdminService.getSystemActivity();
        setActivities(data);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'SuperAdmin', path: '/superadmin/dashboard' }, { label: 'System Activity' }]} />

      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">System Activity Audit Log</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Platform-wide administrative logs, workspace onboarding events, and security status updates.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState type="skeleton-table" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Executed By</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((act) => (
                  <TableRow key={act.id}>
                    <TableCell className="font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        {act.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : act.type === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Info className="w-4 h-4 text-indigo-600" />
                        )}
                        <span>{act.event}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-slate-600 max-w-md">{act.description}</TableCell>

                    <TableCell>
                      <Badge variant="purple">{act.user}</Badge>
                    </TableCell>

                    <TableCell className="text-slate-500">{formatDate(act.timestamp)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
