import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { dataService } from '../../services/dataService';
import { GroupType, CurrencyCode } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';

export const CreateGroupPage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [groupType, setGroupType] = useState<GroupType>('trip');
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const groupTypes: { id: GroupType; label: string; desc: string }[] = [
    { id: 'trip', label: 'Trip / Travel', desc: 'Friends vacation, road trip, weekend getaway' },
    { id: 'home', label: 'Home / Roommates', desc: 'Rent, groceries, utilities, WiFi' },
    { id: 'couple', label: 'Couple', desc: 'Shared dining, household, shared subscriptions' },
    { id: 'event', label: 'Event / Party', desc: 'Birthday party, wedding, conference' },
    { id: 'other', label: 'Other', desc: 'General expense sharing' },
  ];

  const currencies: { code: CurrencyCode; label: string }[] = [
    { code: 'INR', label: '₹ INR (Indian Rupee)' },
    { code: 'USD', label: '$ USD (US Dollar)' },
    { code: 'EUR', label: '€ EUR (Euro)' },
    { code: 'GBP', label: '£ GBP (British Pound)' },
    { code: 'AED', label: 'AED (UAE Dirham)' },
    { code: 'CAD', label: 'CA$ CAD (Canadian Dollar)' },
    { code: 'AUD', label: 'A$ AUD (Australian Dollar)' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await dataService.createGroup({
        name: name.trim(),
        description: description.trim(),
        groupType,
        currency,
      });

      toast.success(`Group "${created.name}" created!`);
      navigate(`/groups/${created.id}`);
    } catch {
      toast.error('Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      <Link
        to="/groups"
        className="inline-flex items-center text-xs font-medium text-foreground-muted hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-3.5 w-3.5" />
        Back to groups
      </Link>

      <Card className="border-border/80 shadow-elevated">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-xl">Create a New Expense Group</CardTitle>
            <CardDescription>
              Set up your shared group, select default currency and invite members.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Input
              label="Group Name"
              placeholder="e.g. Manali Snow Trip 2026, Flat 104, Goa Getaway"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-foreground-muted">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="What is this group for? Add a short note for members."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-border bg-card-elevated/50 px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-foreground-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent transition-colors"
              />
            </div>

            {/* Group Type Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-foreground-muted">
                Group Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {groupTypes.map((t) => {
                  const isSelected = groupType === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setGroupType(t.id)}
                      className={`cursor-pointer p-3 rounded-xl border transition-all text-left flex items-start justify-between ${
                        isSelected
                          ? 'border-primary bg-primary-muted/20 shadow-xs'
                          : 'border-border bg-card hover:bg-card-elevated/40'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          {t.label}
                        </p>
                        <p className="text-[11px] text-foreground-muted">{t.desc}</p>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Currency Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-foreground-muted">
                Default Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-foreground-muted">
                All expenses in this group will be split and settled in this currency.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end space-x-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/groups')}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create Group & Continue
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
