import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { clientService } from '../../services/clientService';
import { useNavigate } from 'react-router-dom';
import { Briefcase, ArrowRight, Building2 } from 'lucide-react';

export const MyClientsWidget = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyClients = async () => {
      setLoading(true);
      try {
        const list = await clientService.getClients();
        setClients(list || []);
      } catch (err) {
        console.warn('Failed to load my clients:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyClients();
  }, []);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4 space-y-3">
          <div className="h-4 bg-slate-200 rounded w-1/3"></div>
          <div className="h-12 bg-slate-100 rounded-xl"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200/90 shadow-2xs">
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-600" />
            <span>My Clients</span>
            <span className="ml-1 px-2 py-0.5 text-xs bg-indigo-50 text-indigo-700 font-extrabold rounded-full">
              {clients.length}
            </span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/workspace/clients')} rightIcon={ArrowRight}>
            All Clients
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {clients.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 font-medium">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">No assigned clients currently</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Your assigned agency clients will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map((client) => (
              <div
                key={client.id}
                className="p-3.5 bg-slate-50/80 hover:bg-slate-100/80 rounded-2xl border border-slate-200/60 transition-all flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar src={client.logoUrl} name={client.companyName} size="md" />
                  <div className="min-w-0">
                    <h4 className="text-xs font-extrabold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                      {client.companyName}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5 flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Client assigned to you
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="info" size="sm">
                    {client.status || 'Active'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => navigate('/workspace/clients')}
                    iconOnly
                    title="Open Client"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
