import React, { useState } from 'react';
import { Settings, Package, ShoppingCart, List, FileSpreadsheet, Activity, DollarSign } from 'lucide-react';
import OverheadCosts from './OverheadCosts';
import MasterBahan from './MasterBahan';
import TreatmentBOM from './TreatmentBOM';
import MaterialPurchases from './MaterialPurchases';
import StockMovements from './StockMovements';
import StockOpname from './StockOpname';
import ProfitabilityReport from './ProfitabilityReport';

const CostingDashboard = () => {
  const [activeTab, setActiveTab] = useState('overhead');

  const tabs = [
    { id: 'overhead', label: 'Biaya Operasional', icon: DollarSign },
    { id: 'bom', label: 'Resep Bahan (BOM)', icon: FileSpreadsheet },
    { id: 'master', label: 'Master Bahan & Gudang', icon: Package },
    { id: 'purchase', label: 'Stok Masuk', icon: ShoppingCart },
    { id: 'stock_card', label: 'Kartu Stok', icon: List },
    { id: 'opname', label: 'Stok Opname', icon: Settings },
    { id: 'profitability', label: 'Lap. Profitabilitas', icon: Activity },
  ];

  return (
    <div className="space-y-6 animate-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Biaya & Modal</h1>
          <p className="text-sm text-text-muted mt-1">
            Manajemen biaya overhead, resep bahan (BOM), dan inventori gudang.
          </p>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="border-b border-border bg-background/50">
          <nav className="flex space-x-1 p-2 overflow-x-auto no-scrollbar" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-accent-primary/15 text-accent-primary'
                      : 'text-text-muted hover:text-text-primary hover:bg-background'
                  }`}
                >
                  <Icon className={`mr-2 h-4 w-4 ${isActive ? 'text-accent-primary' : 'text-text-muted'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
        
        <div className="p-6">
          {activeTab === 'overhead' && <OverheadCosts />}
          {activeTab === 'master' && <MasterBahan />}
          {activeTab === 'bom' && <TreatmentBOM />}
          {activeTab === 'purchase' && <MaterialPurchases />}
          {activeTab === 'stock_card' && <StockMovements />}
          {activeTab === 'opname' && <StockOpname />}
          {activeTab === 'profitability' && <ProfitabilityReport />}
        </div>
      </div>
    </div>
  );
};

export default CostingDashboard;
