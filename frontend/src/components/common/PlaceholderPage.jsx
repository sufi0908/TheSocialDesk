import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Construction, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PlaceholderPage = ({
  title = 'Module Under Construction',
  subtitle = 'We are crafting a world-class experience for this SocialDesk feature.',
  icon: Icon = Construction,
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
      </div>

      {/* Main Card */}
      <Card className="border-dashed border-slate-300">
        <CardContent className="py-16 text-center flex flex-col items-center">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl mb-4 border border-indigo-100/80 shadow-2xs">
            <Icon className="w-10 h-10 stroke-1.5" />
          </div>

          <h2 className="text-lg font-semibold text-slate-900">{title} Module Architecture Ready</h2>
          <p className="text-xs text-slate-500 max-w-md mt-2 leading-relaxed">
            The frontend folder structure, mock services, and layout context are fully set up for this section.
          </p>

          <div className="mt-6 flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/workspace/dashboard')} rightIcon={ArrowRight}>
              Back to Dashboard
            </Button>
            <Button variant="primary" size="sm" leftIcon={Sparkles}>
              View System Roadmap
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
