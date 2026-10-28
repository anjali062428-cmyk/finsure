import React, { useState, useEffect } from 'react';
import { Plus, ShieldCheck, Trash2, Info, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

interface TrustedPayee {
  id: string;
  vpa: string;
  name: string;
  category: string;
  verified: boolean;
  addedAt: string;
}

const STORAGE_KEY = 'finsure_trusted_payees';

const DEFAULT_PAYEES: TrustedPayee[] = [
  {
    id: '1',
    vpa: 'supermarket_fresh@hdfcbank',
    name: 'Fresh Supermarket Provisions',
    category: 'Groceries',
    verified: true,
    addedAt: '2026-09-10',
  },
  {
    id: '2',
    vpa: 'swiggy_delivery@icici',
    name: 'Swiggy Food Logistics',
    category: 'Dining',
    verified: true,
    addedAt: '2026-09-15',
  },
  {
    id: '3',
    vpa: 'electricity_bill_desk@icici',
    name: 'State Electricity Board',
    category: 'Utilities',
    verified: true,
    addedAt: '2026-09-20',
  },
];

export const CustomerPayeesPage: React.FC = () => {
  const [payees, setPayees] = useState<TrustedPayee[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newVpa, setNewVpa] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Personal');
  const [successToast, setSuccessToast] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPayees(JSON.parse(stored));
      } else {
        setPayees(DEFAULT_PAYEES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PAYEES));
      }
    } catch {
      setPayees(DEFAULT_PAYEES);
    }
  }, []);

  const savePayees = (updated: TrustedPayee[]) => {
    setPayees(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save payees to local storage', e);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVpa.trim() || !newName.trim()) return;

    const newEntry: TrustedPayee = {
      id: String(Date.now()),
      vpa: newVpa.trim(),
      name: newName.trim(),
      category: newCategory,
      verified: true,
      addedAt: new Date().toISOString().split('T')[0],
    };

    savePayees([...payees, newEntry]);
    setNewVpa('');
    setNewName('');
    setIsModalOpen(false);
    setSuccessToast(`Payee ${newEntry.name} added to trusted whitelist.`);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  const handleRemove = (id: string) => {
    const updated = payees.filter((p) => p.id !== id);
    savePayees(updated);
  };

  return (
    <div className="space-y-6">
      {/* Phase 9B Architecture Disclosure Banner */}
      <div className="p-3.5 rounded-lg bg-surface-muted border border-border flex items-start gap-3 text-xs">
        <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-text font-semibold">
            Client-Side Whitelist Storage (Phase 9B Policy Notice)
          </strong>
          <p className="text-text-muted">
            Payee whitelisting is maintained locally in your browser storage for this phase. When simulated in the scoring engine, known payees benefit from established baseline transaction trust.
          </p>
        </div>
      </div>

      <PageHeader
        title="Trusted Payee Whitelist"
        description="Pre-authorized beneficiaries that bypass high-friction challenge thresholds."
        breadcrumbs={[
          { label: 'Dashboard', href: '/customer' },
          { label: 'Payees' },
        ]}
        actions={
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Add Trusted Payee</span>
          </Button>
        }
      />

      {successToast && (
        <div className="p-3 rounded-md bg-risk-low/10 border border-risk-low/20 text-xs text-risk-low font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {payees.map((p) => (
          <Card key={p.id} className="p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-muted text-text-muted">
                  {p.category}
                </span>
                <span className="flex items-center space-x-1 text-xs text-risk-low font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Whitelisted</span>
                </span>
              </div>
              <h4 className="text-sm font-semibold text-text mt-2">{p.name}</h4>
              <p className="text-xs font-mono text-accent mt-0.5">{p.vpa}</p>
              <span className="text-[10px] text-text-muted font-mono block mt-2">
                Added: {p.addedAt}
              </span>
            </div>

            <div className="pt-2 border-t border-border/60 flex justify-end">
              <button
                type="button"
                onClick={() => handleRemove(p.id)}
                className="text-xs text-risk-critical hover:underline flex items-center space-x-1 font-mono"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                <span>Remove</span>
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Trusted Beneficiary">
        <form onSubmit={handleAdd} className="space-y-4 pt-2">
          <Input
            label="Beneficiary Display Name"
            placeholder="e.g. Anand Sharma"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <Input
            label="UPI Virtual Payment Address (VPA)"
            placeholder="username@okhdfcbank"
            value={newVpa}
            onChange={(e) => setNewVpa(e.target.value)}
            required
          />
          <Input
            label="Category"
            placeholder="e.g. Personal, Utilities, Rent"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />

          <div className="flex justify-end space-x-3 pt-3 border-t border-border">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Whitelist Beneficiary
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
