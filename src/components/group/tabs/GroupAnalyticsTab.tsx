import React from 'react';
import { Group, Expense, MemberBalance, UserProfile } from '../../../types';
import { formatCurrency } from '../../../engine/balanceEngine';
import { Card } from '../../ui/Card';
import { Download, FileText, BarChart3, PieChart } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart as RechartsPie,
  Pie,
} from 'recharts';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

import { Button } from '../../ui/Button';

interface GroupAnalyticsTabProps {
  group: Group;
  expenses: Expense[];
  settlements?: unknown;
  balances: Map<string, MemberBalance>;
}

const COLORS = [
  '#FF5B42', // Retro Coral
  '#FFD749', // Retro Gold
  '#802C62', // Retro Berry
  '#421454', // Retro Plum
  '#FF7E6B',
  '#FFE27A',
  '#A03B7C',
  '#63207E',
  '#FA8C16',
  '#13C2C2',
];

export const GroupAnalyticsTab: React.FC<GroupAnalyticsTabProps> = ({
  group,
  expenses,
  balances,
}) => {
  const members = group.members || [];
  const totalSpendMinor = expenses.reduce((sum, e) => sum + e.amountMinor, 0);
  const avgExpenseMinor = expenses.length > 0 ? Math.round(totalSpendMinor / expenses.length) : 0;
  const highestExpense = expenses.length > 0
    ? [...expenses].sort((a, b) => b.amountMinor - a.amountMinor)[0]
    : null;

  const getMemberProfile = (userId: string): UserProfile | undefined => {
    return members.find((m) => m.userId === userId)?.profile;
  };

  // Category Chart Data
  const categoryMap: Record<string, number> = {};
  for (const exp of expenses) {
    categoryMap[exp.category] = (categoryMap[exp.category] || 0) + exp.amountMinor / 100;
  }
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value: Math.round(value),
  }));

  // Member Contribution Chart Data
  const memberSpendData = Array.from(balances.values()).map((b) => {
    const prof = getMemberProfile(b.userId);
    return {
      name: prof?.fullName.split(' ')[0] || 'User',
      paid: Math.round(b.totalPaidMinor / 100),
      share: Math.round(b.totalShareMinor / 100),
    };
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (expenses.length === 0) {
      toast.error('No expenses to export');
      return;
    }

    const headers = ['Date', 'Title', 'Category', `Amount (${group.currency})`, 'Paid By', 'Participants Count', 'Notes'];
    const rows = expenses.map((exp) => {
      const payerNames = exp.payers
        .map((p) => getMemberProfile(p.userId)?.fullName || 'Member')
        .join('; ');
      return [
        `"${exp.expenseDate}"`,
        `"${exp.title.replace(/"/g, '""')}"`,
        `"${exp.category}"`,
        (exp.amountMinor / 100).toFixed(2),
        `"${payerNames}"`,
        exp.splits.length,
        `"${(exp.description || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${group.name.replace(/\s+/g, '_')}_expenses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV report exported!');
  };

  // Export to PDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFont('helvetica');

      // Header
      doc.setFontSize(20);
      doc.setTextColor(66, 20, 84); // Retro Plum (#421454)
      doc.text('SplitMate Financial Summary', 14, 20);

      doc.setFontSize(12);
      doc.setTextColor(50, 50, 50);
      doc.text(`Group: ${group.name}`, 14, 28);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Exported on ${new Date().toLocaleDateString()} • Currency: ${group.currency}`, 14, 34);

      // Top Stats
      doc.setDrawColor(220, 220, 220);
      doc.line(14, 38, 196, 38);

      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text(`Total Group Expenses: ${formatCurrency(totalSpendMinor, group.currency)}`, 14, 46);
      doc.text(`Total Expenses Count: ${expenses.length}`, 14, 52);
      doc.text(`Active Members: ${members.length}`, 14, 58);

      doc.line(14, 64, 196, 64);

      // Member Net Balances Table
      doc.setFontSize(13);
      doc.setTextColor(128, 44, 98); // Retro Berry (#802C62)
      doc.text('Member Balance Settlement Summary', 14, 72);

      let yPos = 80;
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text('Member', 14, yPos);
      doc.text('Total Paid', 80, yPos);
      doc.text('Total Share', 120, yPos);
      doc.text('Net Balance', 160, yPos);
      yPos += 4;
      doc.line(14, yPos, 196, yPos);
      yPos += 6;

      doc.setTextColor(40, 40, 40);
      Array.from(balances.values()).forEach((b) => {
        const prof = getMemberProfile(b.userId);
        const name = prof?.fullName || 'User';
        doc.text(name, 14, yPos);
        doc.text(formatCurrency(b.totalPaidMinor, group.currency), 80, yPos);
        doc.text(formatCurrency(b.totalShareMinor, group.currency), 120, yPos);
        doc.text(formatCurrency(b.netBalanceMinor, group.currency, true), 160, yPos);
        yPos += 6;
      });

      // Itemized Expenses
      yPos += 6;
      doc.line(14, yPos, 196, yPos);
      yPos += 8;
      doc.setFontSize(13);
      doc.setTextColor(255, 91, 66); // Retro Coral (#FF5B42)
      doc.text('Itemized Group Expenses', 14, yPos);

      yPos += 8;
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text('Date', 14, yPos);
      doc.text('Title', 40, yPos);
      doc.text('Category', 110, yPos);
      doc.text('Amount', 160, yPos);
      yPos += 4;
      doc.line(14, yPos, 196, yPos);
      yPos += 6;

      doc.setTextColor(40, 40, 40);
      expenses.forEach((exp) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(exp.expenseDate, 14, yPos);
        doc.text(exp.title.slice(0, 30), 40, yPos);
        doc.text(exp.category, 110, yPos);
        doc.text(formatCurrency(exp.amountMinor, group.currency), 160, yPos);
        yPos += 6;
      });

      doc.save(`${group.name.replace(/\s+/g, '_')}_summary.pdf`);
      toast.success('PDF report generated and downloaded!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF summary');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Export Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Spending Analytics</h3>
          <p className="text-xs text-foreground-muted">
            Financial insights, category distributions and audit reports
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none text-xs"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportPDF}
            className="flex-1 sm:flex-none text-xs"
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            <span>Export PDF Report</span>
          </Button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-primary">
          <span className="text-xs text-foreground-muted uppercase font-semibold">
            Average Expense
          </span>
          <div className="text-xl font-bold text-foreground mt-1">
            {formatCurrency(avgExpenseMinor, group.currency)}
          </div>
          <p className="text-[11px] text-foreground-muted mt-1">
            Mean per bill across {expenses.length} bills
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-l-secondary">
          <span className="text-xs text-foreground-muted uppercase font-semibold">
            Highest Expense
          </span>
          <div className="text-xl font-bold text-foreground mt-1">
            {highestExpense
              ? formatCurrency(highestExpense.amountMinor, group.currency)
              : '₹0.00'}
          </div>
          <p className="text-[11px] text-foreground-muted mt-1 truncate">
            {highestExpense ? highestExpense.title : 'None recorded yet'}
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-l-positive">
          <span className="text-xs text-foreground-muted uppercase font-semibold">
            Total Group Volume
          </span>
          <div className="text-xl font-bold text-positive mt-1">
            {formatCurrency(totalSpendMinor, group.currency)}
          </div>
          <p className="text-[11px] text-foreground-muted mt-1">
            All pooled payments to date
          </p>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution Chart */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-foreground">Spending by Category</h4>
            <PieChart className="h-4 w-4 text-foreground-muted" />
          </div>

          {categoryData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-foreground-muted">
              No expense data to chart
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.name} (${entry.value})`}
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [`${group.currency} ${val.toLocaleString()}`, 'Spent']}
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Member Contribution vs Share Chart */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-foreground">
              Member Paid vs Personal Share
            </h4>
            <BarChart3 className="h-4 w-4 text-foreground-muted" />
          </div>

          {memberSpendData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-foreground-muted">
              No member data to chart
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memberSpendData}>
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} />
                  <Tooltip
                    formatter={(val: number, name: string) => [
                      `${group.currency} ${val.toLocaleString()}`,
                      name === 'paid' ? 'Total Paid' : 'Personal Share',
                    ]}
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="paid" fill="#FF5B42" radius={[4, 4, 0, 0]} name="paid" />
                  <Bar dataKey="share" fill="#FFD749" radius={[4, 4, 0, 0]} name="share" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
