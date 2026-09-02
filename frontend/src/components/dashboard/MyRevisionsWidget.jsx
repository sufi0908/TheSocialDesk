import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingState } from '../common/LoadingState';
import { revisionService } from '../../services/revisionService';
import { formatDate } from '../../utils/formatters';
import { RotateCcw, Clock, AlertTriangle, ArrowRight, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MyRevisionsWidget = () => {
  const navigate = useNavigate();
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRevisions = async () => {
      setLoading(true);
      try {
        const list = await revisionService.getMyRevisions();
        setRevisions(list || []);
      } catch (err) {
        setRevisions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRevisions();
  }, []);

  const openRevisionsList = () => {
    navigate('/workspace/content?filter=revision');
  };

  const getPriorityClass = (p) => {
    switch (p) {
      case 'URGENT':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'MEDIUM':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return <LoadingState type="skeleton-cards" count={2} />;
  }

  return (
    <Card className="rounded-2xl border-slate-200/90 shadow-2xs bg-white">
      <CardHeader className="py-3 px-4 border-b border-slate-100 flex items-center justify-between">
        <CardTitle className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-amber-600" />
          <span>My Revision Requests ({revisions.length})</span>
        </CardTitle>
        <Button variant="ghost" size="xs" onClick={openRevisionsList} rightIcon={ArrowRight}>
          View Content
        </Button>
      </CardHeader>

      <CardContent className="p-3 space-y-2">
        {revisions.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 font-medium space-y-1">
            <RotateCcw className="w-6 h-6 text-slate-300 mx-auto mb-1" />
            <p className="font-bold text-slate-700">No active revision requests</p>
            <p>You have completed all requested changes!</p>
          </div>
        ) : (
          revisions.slice(0, 3).map((rev) => (
            <div
              key={rev.id}
              onClick={() => navigate(`/workspace/content?id=${rev.content_id}`)}
              className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer space-y-1.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 leading-snug line-clamp-1">
                  {rev.content_title}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border uppercase shrink-0 ${getPriorityClass(rev.priority)}`}>
                  {rev.priority}
                </span>
              </div>

              <p className="text-slate-600 text-[11px] line-clamp-2 italic bg-white p-2 rounded-lg border border-slate-100">
                "{rev.reason}"
              </p>

              <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                <span>Client: <strong className="text-slate-800">{rev.client_name}</strong></span>
                {rev.is_overdue === 1 ? (
                  <span className="text-red-700 font-black uppercase flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-600" /> OVERDUE
                  </span>
                ) : (
                  <span className="font-mono text-slate-400">{formatDate(rev.created_at)}</span>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
