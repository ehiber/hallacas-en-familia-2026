import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  ShoppingCart,
  Receipt,
  Calculator,
  Plus,
  Minus,
  Trash2,
  Edit3,
  Check,
  X,
  Lock,
  Unlock,
  Copy,
  CheckCircle2,
  RefreshCw,
  DollarSign,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { auth, db, appId, isFirebaseConfigured } from './firebase';

const BASE_EQUIV = 56; // 50 hallacas + 12 bollos (12 * 0.5)
const BASE_HALLACAS = 50;

const INITIAL_GROUPS = [
  { name: 'Flia Arbona Moreno', hallacas: 20, bollos: 0 },
  { name: 'Flia Arbona Arbona', hallacas: 20, bollos: 0 },
  { name: 'Los Pacitas', hallacas: 30, bollos: 0 },
  { name: 'Moreno Chacón', hallacas: 30, bollos: 0 },
];

const BASE_INGREDIENTS = [
  // Masa y Armado
  { id: 'hojas', category: 'Masa y Armado', name: 'Hojas de plátano', baseQty: 6, unit: 'kg', type: 'weight_kg', scaleBy: 'equiv' },
  { id: 'harina', category: 'Masa y Armado', name: 'Harina de maíz precocida', baseQty: 2, unit: 'paquete', unitPlural: 'paquetes', type: 'indivisible', scaleBy: 'equiv' },
  { id: 'onoto', category: 'Masa y Armado', name: 'Onoto (en grano o molido)', baseQty: 100, unit: 'g', type: 'weight_g', scaleBy: 'equiv' },
  { id: 'pabilo', category: 'Masa y Armado', name: 'Pabilo', baseQty: 2, unit: 'rollo', unitPlural: 'rollos', type: 'indivisible', scaleBy: 'equiv' },
  { id: 'aceite', category: 'Masa y Armado', name: 'Aceite vegetal (onotado y sofrito)', baseQty: 1, unit: 'litro', unitPlural: 'litros', type: 'indivisible', scaleBy: 'equiv' },

  // Carnes
  { id: 'res', category: 'Carnes', name: 'Carne de res', baseQty: 2, unit: 'kg', type: 'weight_kg', scaleBy: 'equiv' },
  { id: 'cochino', category: 'Carnes', name: 'Cochino (cerdo)', baseQty: 1.5, unit: 'kg', type: 'weight_kg', scaleBy: 'equiv' },
  { id: 'tocino', category: 'Carnes', name: 'Tocino', baseQty: 100, unit: 'g', type: 'weight_g', scaleBy: 'equiv' },

  // Aliños y Sofrito
  { id: 'cebolla', category: 'Aliños y Sofrito', name: 'Cebollas redondas', baseQty: 4, unit: 'unidad', unitPlural: 'unidades', type: 'indivisible', scaleBy: 'equiv' },
  { id: 'ajoporro', category: 'Aliños y Sofrito', name: 'Ajoporro', baseQty: 1, unit: 'unidad', unitPlural: 'unidades', type: 'indivisible', scaleBy: 'equiv' },
  { id: 'cebollin', category: 'Aliños y Sofrito', name: 'Cebollines grandes', baseQty: 5, unit: 'unidad', unitPlural: 'unidades', type: 'indivisible', scaleBy: 'equiv' },
  { id: 'celery', category: 'Aliños y Sofrito', name: 'Tallos de celery (apio España)', baseQty: 4, unit: 'tallo', unitPlural: 'tallos', type: 'indivisible', scaleBy: 'equiv' },
  { id: 'ajo', category: 'Aliños y Sofrito', name: 'Cabezas de ajo', baseQty: 3, unit: 'cabeza', unitPlural: 'cabezas', type: 'indivisible', scaleBy: 'equiv' },
  { id: 'alcaparras_guiso', category: 'Aliños y Sofrito', name: 'Alcaparras trituradas (guiso)', baseQty: 100, unit: 'g', type: 'weight_g', scaleBy: 'equiv' },
  { id: 'aji_dulce', category: 'Aliños y Sofrito', name: 'Ajíes dulces', baseQty: 8, unit: 'unidad', unitPlural: 'unidades', type: 'indivisible', scaleBy: 'equiv' },
  { id: 'pimenton_guiso', category: 'Aliños y Sofrito', name: 'Pimentones rojos (guiso)', baseQty: 3, unit: 'unidad', unitPlural: 'unidades', type: 'indivisible', scaleBy: 'equiv' },
  { id: 'tomate', category: 'Aliños y Sofrito', name: 'Tomates maduros', baseQty: 4, unit: 'unidad', unitPlural: 'unidades', type: 'indivisible', scaleBy: 'equiv' },

  // Líquidos y Sazón
  { id: 'vino', category: 'Líquidos y Sazón', name: 'Vino para cocinar / tinto', baseQty: 1, unit: 'botella', unitPlural: 'botellas', type: 'indivisible', scaleBy: 'equiv' },
  { id: 'papelon', category: 'Líquidos y Sazón', name: 'Papelón', baseQty: 250, unit: 'g', type: 'weight_g', scaleBy: 'equiv' },
  { id: 'encurtidos', category: 'Líquidos y Sazón', name: 'Encurtidos en vinagre', baseQty: 250, unit: 'g', type: 'weight_g', scaleBy: 'equiv' },
  { id: 'caldo', category: 'Líquidos y Sazón', name: 'Caldo (tazas / cubitos)', baseQty: 2, unit: 'taza', unitPlural: 'tazas', type: 'indivisible', scaleBy: 'equiv' },
  { id: 'sal_pimienta', category: 'Líquidos y Sazón', name: 'Sal y pimienta (al gusto)', baseQty: 1, unit: 'al gusto', type: 'fixed', scaleBy: 'equiv' },

  // Adornos (escalan solo por hallacas y son opcionales)
  { id: 'aceitunas', category: 'Adornos (Opcionales)', name: 'Aceitunas rellenas', baseQty: 300, unit: 'g', type: 'weight_g', scaleBy: 'hallacas', optional: true },
  { id: 'pasas', category: 'Adornos (Opcionales)', name: 'Pasas', baseQty: 200, unit: 'g', type: 'weight_g', scaleBy: 'hallacas', optional: true },
  { id: 'alcaparras_adorno', category: 'Adornos (Opcionales)', name: 'Alcaparras enteras (adorno)', baseQty: 100, unit: 'g', type: 'weight_g', scaleBy: 'hallacas', optional: true },
  { id: 'pimenton_tiras', category: 'Adornos (Opcionales)', name: 'Pimentón rojo en tiras', baseQty: 2, unit: 'unidad', unitPlural: 'unidades', type: 'indivisible', scaleBy: 'hallacas', optional: true },
  { id: 'cebolla_aros', category: 'Adornos (Opcionales)', name: 'Cebolla en aros', baseQty: 2, unit: 'unidad', unitPlural: 'unidades', type: 'indivisible', scaleBy: 'hallacas', optional: true },
];

const CATEGORIES = [
  'Masa y Armado',
  'Carnes',
  'Aliños y Sofrito',
  'Líquidos y Sazón',
  'Adornos (Opcionales)',
];

function formatQty(item, factor) {
  if (item.type === 'fixed') return { display: 'Al gusto', exact: null };
  const raw = item.baseQty * factor;
  if (raw <= 0) return { display: `0 ${item.unitPlural || item.unit}`, exact: null };

  if (item.type === 'indivisible') {
    const rounded = Math.ceil(raw);
    const label = rounded === 1 ? item.unit : item.unitPlural || item.unit;
    const exactStr = Math.abs(rounded - raw) > 0.01 ? `Exacto: ${raw.toFixed(2)}` : null;
    return { display: `${rounded} ${label}`, exact: exactStr };
  }
  if (item.type === 'weight_kg') {
    const val = Math.round(raw * 100) / 100;
    return { display: `${val} kg`, exact: null };
  }
  if (item.type === 'weight_g') {
    const roundedG = Math.ceil(raw / 50) * 50;
    if (roundedG >= 1000) {
      return {
        display: `${(roundedG / 1000).toFixed(2)} kg`,
        exact: Math.abs(roundedG - raw) > 5 ? `Exacto: ${Math.round(raw)} g` : null,
      };
    }
    return {
      display: `${roundedG} g`,
      exact: Math.abs(roundedG - raw) > 5 ? `Exacto: ${Math.round(raw)} g` : null,
    };
  }
  return { display: `${raw.toFixed(1)} ${item.unit}`, exact: null };
}

function toUSD(amount, currency, rate, fallbackRate) {
  const num = parseFloat(amount) || 0;
  if (num <= 0) return 0;
  if (currency === 'BS') {
    const r = parseFloat(rate) || parseFloat(fallbackRate) || 1;
    return r > 0 ? num / r : 0;
  }
  return num;
}

function CountInput({ value, onChange, label }) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = (valStr) => {
    const parsed = Math.max(0, parseInt(valStr, 10) || 0);
    setText(String(parsed));
    if (parsed !== value) onChange(parsed);
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 transition"
        aria-label={`Restar ${label}`}
      >
        <Minus className="w-4 h-4" />
      </button>
      <input
        type="number"
        min="0"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => commit(text)}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="w-14 text-center font-semibold text-stone-800 bg-white border border-stone-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-8 h-8 rounded-lg bg-amber-100 hover:bg-amber-200 flex items-center justify-center text-amber-900 transition"
        aria-label={`Sumar ${label}`}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function App() {
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem('hallacas_unlocked') === 'true');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [user, setUser] = useState(null);
  const [dbError, setDbError] = useState('');
  const [activeTab, setActiveTab] = useState('grupos');

  // Shared Firestore state
  const [groups, setGroups] = useState([]);
  const [globalConfig, setGlobalConfig] = useState({
    mermaPct: 0,
    exchangeRate: 50,
    costMode: 'items', // 'items' | 'invoices'
    itemsState: {}, // { [id]: { checked, enabled, amount, currency, rate, payerId } }
    hallacaInvoices: [], // [{ id, description, amount, currency, rate, payerId }]
  });
  const [customItems, setCustomItems] = useState([]);
  const [otherExpenses, setOtherExpenses] = useState([]);

  // UI local states
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupHallacas, setNewGroupHallacas] = useState(10);
  const [newGroupBollos, setNewGroupBollos] = useState(0);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomQty, setNewCustomQty] = useState('');

  // Invoice form
  const [invDesc, setInvDesc] = useState('');
  const [invAmount, setInvAmount] = useState('');
  const [invCurrency, setInvCurrency] = useState('USD');
  const [invRate, setInvRate] = useState('');
  const [invPayer, setInvPayer] = useState('');

  // Other expense form
  const [otherDesc, setOtherDesc] = useState('');
  const [otherAmount, setOtherAmount] = useState('');
  const [otherCurrency, setOtherCurrency] = useState('USD');
  const [otherRate, setOtherRate] = useState('');
  const [otherPayer, setOtherPayer] = useState('');
  const [otherSplits, setOtherSplits] = useState({}); // { groupId: pct }

  const [copiedMsg, setCopiedMsg] = useState('');

  // Firebase Auth
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        signInAnonymously(auth).catch((err) => {
          console.error('Auth error:', err);
          setDbError(`Error de autenticación: ${err.message}`);
        });
      }
    });
    return () => unsub();
  }, []);

  // Helper paths
  const colPath = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);
  const docPath = (col, id) => doc(db, 'artifacts', appId, 'public', 'data', col, id);

  // Firestore listeners + one-time seed
  useEffect(() => {
    if (!user || !db) return;

    const seedIfNeeded = async () => {
      try {
        const metaRef = docPath('hallacas_meta', 'seed');
        const metaSnap = await getDoc(metaRef);
        if (!metaSnap.exists()) {
          await setDoc(metaRef, { seeded: true, createdAt: Date.now() });
          for (const g of INITIAL_GROUPS) {
            await addDoc(colPath('hallacas_groups'), { ...g, createdAt: Date.now() });
          }
        }
      } catch (err) {
        console.error('Seed error:', err);
        setDbError(`Error de permisos o conexión: ${err.message}`);
      }
    };
    seedIfNeeded();

    const unsubGroups = onSnapshot(
      colPath('hallacas_groups'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        setGroups(list);
      },
      (err) => setDbError(`Error leyendo grupos: ${err.message}`)
    );

    const unsubConfig = onSnapshot(
      docPath('hallacas_items_state', 'global'),
      (snap) => {
        if (snap.exists()) {
          setGlobalConfig((prev) => ({ ...prev, ...snap.data() }));
        }
      },
      (err) => setDbError(`Error leyendo configuración: ${err.message}`)
    );

    const unsubCustom = onSnapshot(
      colPath('hallacas_custom_items'),
      (snap) => {
        setCustomItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => setDbError(`Error leyendo extras: ${err.message}`)
    );

    const unsubOther = onSnapshot(
      colPath('hallacas_other_expenses'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setOtherExpenses(list);
      },
      (err) => setDbError(`Error leyendo otras compras: ${err.message}`)
    );

    return () => {
      unsubGroups();
      unsubConfig();
      unsubCustom();
      unsubOther();
    };
  }, [user]);

  // Initialize default equal splits when groups load
  useEffect(() => {
    if (groups.length > 0 && Object.keys(otherSplits).length === 0) {
      const equal = Number((100 / groups.length).toFixed(2));
      const next = {};
      groups.forEach((g, idx) => {
        next[g.id] = idx === groups.length - 1 ? Number((100 - equal * (groups.length - 1)).toFixed(2)) : equal;
      });
      setOtherSplits(next);
    }
  }, [groups]);

  const updateGlobal = async (patch) => {
    if (!db) return;
    try {
      await setDoc(docPath('hallacas_items_state', 'global'), patch, { merge: true });
    } catch (err) {
      setDbError(`No se pudo guardar: ${err.message}`);
    }
  };

  // Calculations
  const totals = useMemo(() => {
    const hallacas = groups.reduce((s, g) => s + (Number(g.hallacas) || 0), 0);
    const bollos = groups.reduce((s, g) => s + (Number(g.bollos) || 0), 0);
    const equiv = hallacas + bollos * 0.5;
    return { hallacas, bollos, equiv };
  }, [groups]);

  const mermaMult = 1 + (Number(globalConfig.mermaPct) || 0) / 100;
  const equivFactor = (totals.equiv / BASE_EQUIV) * mermaMult;
  const hallacasFactor = (totals.hallacas / BASE_HALLACAS) * mermaMult;
  const refRate = Number(globalConfig.exchangeRate) || 50;

  // Total Hallacas Cost (USD) & Payers
  const hallacaFinancials = useMemo(() => {
    let totalUSD = 0;
    const paidByGroup = {};

    if (globalConfig.costMode === 'invoices') {
      (globalConfig.hallacaInvoices || []).forEach((inv) => {
        const usd = toUSD(inv.amount, inv.currency, inv.rate, refRate);
        totalUSD += usd;
        if (inv.payerId) paidByGroup[inv.payerId] = (paidByGroup[inv.payerId] || 0) + usd;
      });
    } else {
      const state = globalConfig.itemsState || {};
      BASE_INGREDIENTS.forEach((item) => {
        const st = state[item.id] || {};
        if (item.optional && st.enabled === false) return;
        const usd = toUSD(st.amount, st.currency || 'USD', st.rate, refRate);
        totalUSD += usd;
        if (st.payerId) paidByGroup[st.payerId] = (paidByGroup[st.payerId] || 0) + usd;
      });
      customItems.forEach((ci) => {
        const usd = toUSD(ci.amount, ci.currency || 'USD', ci.rate, refRate);
        totalUSD += usd;
        if (ci.payerId) paidByGroup[ci.payerId] = (paidByGroup[ci.payerId] || 0) + usd;
      });
    }

    return { totalUSD, paidByGroup };
  }, [globalConfig, customItems, refRate]);

  // Splitwise Settlement
  const settlement = useMemo(() => {
    const rows = groups.map((g) => {
      const gEquiv = (Number(g.hallacas) || 0) + (Number(g.bollos) || 0) * 0.5;
      const sharePct = totals.equiv > 0 ? gEquiv / totals.equiv : 0;
      const hallacasOwed = hallacaFinancials.totalUSD * sharePct;
      const hallacasPaid = hallacaFinancials.paidByGroup[g.id] || 0;

      let otherOwed = 0;
      let otherPaid = 0;
      otherExpenses.forEach((exp) => {
        const expUSD = toUSD(exp.amount, exp.currency, exp.rate, refRate);
        const pct = Number(exp.splits?.[g.id]) || 0;
        otherOwed += expUSD * (pct / 100);
        if (exp.payerId === g.id) otherPaid += expUSD;
      });

      const totalOwed = hallacasOwed + otherOwed;
      const totalPaid = hallacasPaid + otherPaid;
      const balance = totalPaid - totalOwed; // > 0 receives, < 0 owes

      return {
        ...g,
        gEquiv,
        sharePct: sharePct * 100,
        hallacasOwed,
        otherOwed,
        totalOwed,
        totalPaid,
        balance,
      };
    });

    // Simplify debts
    const debtors = rows
      .filter((r) => r.balance < -0.01)
      .map((r) => ({ id: r.id, name: r.name, amount: -r.balance }))
      .sort((a, b) => b.amount - a.amount);

    const creditors = rows
      .filter((r) => r.balance > 0.01)
      .map((r) => ({ id: r.id, name: r.name, amount: r.balance }))
      .sort((a, b) => b.amount - a.amount);

    const transfers = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const amt = Math.min(debtors[i].amount, creditors[j].amount);
      if (amt > 0.01) {
        transfers.push({ from: debtors[i].name, to: creditors[j].name, amount: amt });
      }
      debtors[i].amount -= amt;
      creditors[j].amount -= amt;
      if (debtors[i].amount < 0.01) i++;
      if (creditors[j].amount < 0.01) j++;
    }

    const totalOtherUSD = otherExpenses.reduce(
      (s, e) => s + toUSD(e.amount, e.currency, e.rate, refRate),
      0
    );

    return { rows, transfers, totalOtherUSD, grandTotalUSD: hallacaFinancials.totalUSD + totalOtherUSD };
  }, [groups, totals, hallacaFinancials, otherExpenses, refRate]);

  // Handlers
  const handleUnlock = (e) => {
    e.preventDefault();
    if (passwordInput.trim().toLowerCase() === 'familia') {
      setUnlocked(true);
      localStorage.setItem('hallacas_unlocked', 'true');
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleAddGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    await addDoc(colPath('hallacas_groups'), {
      name: newGroupName.trim(),
      hallacas: Math.max(0, Number(newGroupHallacas) || 0),
      bollos: Math.max(0, Number(newGroupBollos) || 0),
      createdAt: Date.now(),
    });
    setNewGroupName('');
    setNewGroupHallacas(10);
    setNewGroupBollos(0);
  };

  const handleRestoreInitial = async () => {
    for (const g of INITIAL_GROUPS) {
      await addDoc(colPath('hallacas_groups'), { ...g, createdAt: Date.now() });
    }
  };

  const handleSaveGroupName = async (id) => {
    if (editingGroupName.trim()) {
      await updateDoc(docPath('hallacas_groups', id), { name: editingGroupName.trim() });
    }
    setEditingGroupId(null);
  };

  const updateItemState = (id, patch) => {
    const prev = globalConfig.itemsState?.[id] || {};
    updateGlobal({
      itemsState: {
        ...(globalConfig.itemsState || {}),
        [id]: { ...prev, ...patch },
      },
    });
  };

  const handleAddInvoice = async (e) => {
    e.preventDefault();
    if (!invDesc.trim() || !invAmount) return;
    const newInv = {
      id: Date.now().toString(),
      description: invDesc.trim(),
      amount: parseFloat(invAmount) || 0,
      currency: invCurrency,
      rate: invCurrency === 'BS' ? parseFloat(invRate) || refRate : refRate,
      payerId: invPayer,
    };
    await updateGlobal({
      hallacaInvoices: [...(globalConfig.hallacaInvoices || []), newInv],
    });
    setInvDesc('');
    setInvAmount('');
    setInvRate('');
  };

  const handleDeleteInvoice = async (id) => {
    await updateGlobal({
      hallacaInvoices: (globalConfig.hallacaInvoices || []).filter((x) => x.id !== id),
    });
  };

  const handleAddCustomItem = async (e) => {
    e.preventDefault();
    if (!newCustomName.trim()) return;
    await addDoc(colPath('hallacas_custom_items'), {
      name: newCustomName.trim(),
      qty: newCustomQty.trim() || '1',
      checked: false,
      amount: '',
      currency: 'USD',
      rate: refRate,
      payerId: '',
    });
    setNewCustomName('');
    setNewCustomQty('');
  };

  const handleDivideEqualOther = () => {
    if (groups.length === 0) return;
    const equal = Number((100 / groups.length).toFixed(2));
    const next = {};
    groups.forEach((g, idx) => {
      next[g.id] = idx === groups.length - 1 ? Number((100 - equal * (groups.length - 1)).toFixed(2)) : equal;
    });
    setOtherSplits(next);
  };

  const otherSplitTotal = Object.values(otherSplits).reduce((s, v) => s + (parseFloat(v) || 0), 0);

  const handleAddOtherExpense = async (e) => {
    e.preventDefault();
    if (!otherDesc.trim() || !otherAmount || Math.abs(otherSplitTotal - 100) > 0.5) return;
    await addDoc(colPath('hallacas_other_expenses'), {
      description: otherDesc.trim(),
      amount: parseFloat(otherAmount) || 0,
      currency: otherCurrency,
      rate: otherCurrency === 'BS' ? parseFloat(otherRate) || refRate : refRate,
      payerId: otherPayer,
      splits: otherSplits,
      createdAt: Date.now(),
    });
    setOtherDesc('');
    setOtherAmount('');
    setOtherRate('');
  };

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedMsg(label);
    setTimeout(() => setCopiedMsg(''), 2500);
  };

  const copyShoppingList = () => {
    let msg = `🎄 *LISTA DE COMPRAS - HALLACAS 2026* 🎄\n`;
    msg += `📦 Total: ${totals.hallacas} hallacas y ${totals.bollos} bollos (Equiv: ${totals.equiv})\n`;
    if (globalConfig.mermaPct > 0) msg += `📈 Merma aplicada: +${globalConfig.mermaPct}%\n`;
    msg += `\n`;
    CATEGORIES.forEach((cat) => {
      const items = BASE_INGREDIENTS.filter((i) => i.category === cat);
      const active = items.filter((i) => !(i.optional && globalConfig.itemsState?.[i.id]?.enabled === false));
      if (active.length === 0) return;
      msg += `*${cat}*\n`;
      active.forEach((item) => {
        const factor = item.scaleBy === 'hallacas' ? hallacasFactor : equivFactor;
        const { display } = formatQty(item, factor);
        const checked = globalConfig.itemsState?.[item.id]?.checked ? '✅' : '⬜';
        msg += `${checked} ${item.name}: ${display}\n`;
      });
      msg += `\n`;
    });
    if (customItems.length > 0) {
      msg += `*Extras*\n`;
      customItems.forEach((ci) => {
        msg += `${ci.checked ? '✅' : '⬜'} ${ci.name} (${ci.qty})\n`;
      });
    }
    copyText(msg, 'Lista copiada para WhatsApp');
  };

  const copySummaryWhatsApp = () => {
    let msg = `🎄 *RESUMEN Y CUENTAS - HALLACAS 2026* 🎄\n`;
    msg += `📦 ${totals.hallacas} hallacas + ${totals.bollos} bollos (Equiv: ${totals.equiv})\n`;
    msg += `💱 Tasa ref: Bs ${refRate.toFixed(2)} / $\n\n`;
    msg += `💰 *Total Hallacas:* $${hallacaFinancials.totalUSD.toFixed(2)}\n`;
    if (settlement.totalOtherUSD > 0) {
      msg += `🛒 *Otras Compras:* $${settlement.totalOtherUSD.toFixed(2)}\n`;
    }
    msg += `📊 *Total General:* $${settlement.grandTotalUSD.toFixed(2)} (Bs ${(settlement.grandTotalUSD * refRate).toFixed(2)})\n\n`;
    msg += `*Detalle por Familia:*\n`;
    settlement.rows.forEach((r) => {
      msg += `• *${r.name}* (${r.hallacas}h / ${r.bollos}b - ${r.sharePct.toFixed(1)}%): Le toca $${r.totalOwed.toFixed(2)} | Pagó $${r.totalPaid.toFixed(2)}\n`;
    });
    if (settlement.transfers.length > 0) {
      msg += `\n💸 *Liquidación (Quién transfiere a quién):*\n`;
      settlement.transfers.forEach((t) => {
        msg += `➡️ *${t.from}* → *${t.to}*: *$${t.amount.toFixed(2)}* (Bs ${(t.amount * refRate).toFixed(2)})\n`;
      });
    }
    copyText(msg, 'Resumen copiado para WhatsApp');
  };

  // Config missing guard
  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-amber-50">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-amber-200 p-6 space-y-4">
          <div className="flex items-center gap-3 text-amber-700">
            <AlertCircle className="w-7 h-7" />
            <h1 className="text-xl font-bold">Falta configurar Firebase</h1>
          </div>
          <p className="text-sm text-stone-600">
            Agrega tus variables de entorno de Firebase en el archivo <code className="bg-stone-100 px-1.5 py-0.5 rounded">.env</code> (o en Vercel → Environment Variables) siguiendo el archivo <code className="bg-stone-100 px-1.5 py-0.5 rounded">README.md</code>.
          </p>
        </div>
      </div>
    );
  }

  // Password Gate
  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
        <form
          onSubmit={handleUnlock}
          className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-amber-100 p-7 space-y-5"
        >
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-stone-800">Hallacas en Familia 2026</h1>
            <p className="text-sm text-stone-500">Ingresa la clave familiar para ver y editar en tiempo real.</p>
          </div>
          <div>
            <input
              type="password"
              placeholder="Contraseña familiar"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setPasswordError(false);
              }}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-center text-lg"
              autoFocus
            />
            {passwordError && (
              <p className="text-xs text-red-600 text-center mt-2">Clave incorrecta. Intenta de nuevo.</p>
            )}
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold transition shadow-sm"
          >
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-800 via-amber-700 to-orange-700 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-amber-300" />
                Hallacas en Familia 2026
              </h1>
              <p className="text-xs text-amber-100 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                En vivo • Base de datos compartida
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-xl text-sm">
                <span className="text-amber-100 text-xs">Tasa Bs/$:</span>
                <input
                  type="number"
                  step="0.01"
                  value={globalConfig.exchangeRate || ''}
                  onChange={(e) => updateGlobal({ exchangeRate: parseFloat(e.target.value) || 0 })}
                  className="w-20 bg-white/90 text-stone-900 font-semibold px-2 py-0.5 rounded-lg text-sm focus:outline-none"
                />
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('hallacas_unlocked');
                  setUnlocked(false);
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
                title="Bloquear"
              >
                <Unlock className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-xs text-amber-100">Hallacas</div>
              <div className="text-xl font-bold">{totals.hallacas}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-xs text-amber-100">Bollos</div>
              <div className="text-xl font-bold">{totals.bollos}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-xs text-amber-100">Equivalentes (1 bollo = 0.5)</div>
              <div className="text-xl font-bold">{totals.equiv}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-xs text-amber-100">Total General</div>
              <div className="text-xl font-bold">${settlement.grandTotalUSD.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Error banner */}
      {dbError && (
        <div className="max-w-5xl mx-auto px-4 mt-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
            <span>{dbError}</span>
            <button onClick={() => setDbError('')}><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Toast */}
      {copiedMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4" /> {copiedMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 mt-5">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { id: 'grupos', label: 'Grupos', icon: Users },
            { id: 'compras', label: 'Lista de Compras', icon: ShoppingCart },
            { id: 'otras', label: 'Otras Compras', icon: Receipt },
            { id: 'division', label: 'División y WhatsApp', icon: Calculator },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
                  active
                    ? 'bg-amber-700 text-white shadow-sm'
                    : 'bg-white text-stone-600 hover:bg-amber-50 border border-stone-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 mt-4 space-y-6">
        {/* TAB 1: GRUPOS */}
        {activeTab === 'grupos' && (
          <div className="space-y-4">
            <form
              onSubmit={handleAddGroup}
              className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm flex flex-wrap gap-3 items-end"
            >
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-medium text-stone-500 mb-1">Nuevo grupo familiar</label>
                <input
                  type="text"
                  placeholder="Ej. Flia Pérez"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-stone-500 mb-1">Hallacas</label>
                <input
                  type="number"
                  min="0"
                  value={newGroupHallacas}
                  onChange={(e) => setNewGroupHallacas(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm"
                />
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-stone-500 mb-1">Bollos</label>
                <input
                  type="number"
                  min="0"
                  value={newGroupBollos}
                  onChange={(e) => setNewGroupBollos(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Agregar
              </button>
            </form>

            {groups.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-3">
                <p className="text-stone-500 text-sm">No hay grupos familiares registrados.</p>
                <button
                  onClick={handleRestoreInitial}
                  className="px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-sm font-semibold inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Restaurar grupos iniciales (100 hallacas)
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {groups.map((g) => {
                  const row = settlement.rows.find((r) => r.id === g.id);
                  const isEditing = editingGroupId === g.id;
                  return (
                    <div
                      key={g.id}
                      className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              value={editingGroupName}
                              onChange={(e) => setEditingGroupName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveGroupName(g.id);
                                if (e.key === 'Escape') setEditingGroupId(null);
                              }}
                              className="flex-1 px-2.5 py-1 rounded-lg border border-amber-400 text-sm font-semibold focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveGroupName(g.id)}
                              className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingGroupId(null)}
                              className="p-1.5 rounded-lg bg-stone-100 text-stone-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingGroupId(g.id);
                              setEditingGroupName(g.name);
                            }}
                            className="flex items-center gap-2 text-left font-bold text-stone-800 hover:text-amber-700 group"
                          >
                            <span>{g.name}</span>
                            <Edit3 className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-600" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteDoc(docPath('hallacas_groups', g.id))}
                          className="p-1.5 text-stone-400 hover:text-red-600 transition"
                          title="Eliminar grupo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div>
                          <div className="text-xs text-stone-500 mb-1">Hallacas</div>
                          <CountInput
                            label="hallacas"
                            value={Number(g.hallacas) || 0}
                            onChange={(val) => updateDoc(docPath('hallacas_groups', g.id), { hallacas: val })}
                          />
                        </div>
                        <div>
                          <div className="text-xs text-stone-500 mb-1">Bollos</div>
                          <CountInput
                            label="bollos"
                            value={Number(g.bollos) || 0}
                            onChange={(val) => updateDoc(docPath('hallacas_groups', g.id), { bollos: val })}
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                        <span>Participación: <strong className="text-stone-700">{(row?.sharePct || 0).toFixed(1)}%</strong></span>
                        <span>Aporte total: <strong className="text-amber-800">${(row?.totalOwed || 0).toFixed(2)}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LISTA DE COMPRAS */}
        {activeTab === 'compras' && (
          <div className="space-y-4">
            {/* Controls bar */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-stone-600">Merma:</span>
                  <select
                    value={globalConfig.mermaPct || 0}
                    onChange={(e) => updateGlobal({ mermaPct: Number(e.target.value) })}
                    className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-sm bg-stone-50 font-medium"
                  >
                    {[0, 5, 10, 15, 20].map((m) => (
                      <option key={m} value={m}>
                        {m === 0 ? '0% (Sin merma)' : `+${m}%`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex rounded-xl bg-stone-100 p-1 text-xs font-semibold">
                  <button
                    onClick={() => updateGlobal({ costMode: 'items' })}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      globalConfig.costMode !== 'invoices' ? 'bg-white text-amber-800 shadow-sm' : 'text-stone-500'
                    }`}
                  >
                    Costo por ítems
                  </button>
                  <button
                    onClick={() => updateGlobal({ costMode: 'invoices' })}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      globalConfig.costMode === 'invoices' ? 'bg-white text-amber-800 shadow-sm' : 'text-stone-500'
                    }`}
                  >
                    Total global / Facturas
                  </button>
                </div>
              </div>

              <button
                onClick={copyShoppingList}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Copy className="w-4 h-4" /> Copiar Lista WhatsApp
              </button>
            </div>

            {/* Global Invoices Mode */}
            {globalConfig.costMode === 'invoices' && (
              <div className="bg-amber-50/70 rounded-2xl border border-amber-200 p-4 space-y-3">
                <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Facturas / Pagos Globales de Hallacas
                </h3>
                <form onSubmit={handleAddInvoice} className="grid sm:grid-cols-6 gap-2">
                  <input
                    type="text"
                    placeholder="Ej. Mercado carne y aliños"
                    value={invDesc}
                    onChange={(e) => setInvDesc(e.target.value)}
                    className="sm:col-span-2 px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Monto"
                    value={invAmount}
                    onChange={(e) => setInvAmount(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm"
                  />
                  <select
                    value={invCurrency}
                    onChange={(e) => setInvCurrency(e.target.value)}
                    className="px-2 py-2 rounded-xl border border-stone-200 bg-white text-sm"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="BS">Bs</option>
                  </select>
                  {invCurrency === 'BS' ? (
                    <input
                      type="number"
                      step="0.01"
                      placeholder={`Tasa (${refRate})`}
                      value={invRate}
                      onChange={(e) => setInvRate(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm"
                    />
                  ) : (
                    <select
                      value={invPayer}
                      onChange={(e) => setInvPayer(e.target.value)}
                      className="px-2 py-2 rounded-xl border border-stone-200 bg-white text-sm"
                    >
                      <option value="">¿Quién pagó?</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  )}
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold"
                  >
                    Agregar
                  </button>
                  {invCurrency === 'BS' && (
                    <select
                      value={invPayer}
                      onChange={(e) => setInvPayer(e.target.value)}
                      className="sm:col-span-2 px-2 py-2 rounded-xl border border-stone-200 bg-white text-sm"
                    >
                      <option value="">¿Quién pagó?</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  )}
                </form>

                {(globalConfig.hallacaInvoices || []).length > 0 && (
                  <div className="space-y-2 pt-2">
                    {(globalConfig.hallacaInvoices || []).map((inv) => {
                      const usd = toUSD(inv.amount, inv.currency, inv.rate, refRate);
                      const payer = groups.find((g) => g.id === inv.payerId)?.name || 'Sin asignar';
                      return (
                        <div
                          key={inv.id}
                          className="bg-white rounded-xl px-3 py-2 border border-amber-100 flex items-center justify-between text-sm"
                        >
                          <div>
                            <span className="font-semibold text-stone-800">{inv.description}</span>
                            <span className="text-xs text-stone-500 ml-2">Pagó: {payer}</span>
                            {inv.currency === 'BS' && (
                              <span className="text-xs text-amber-700 ml-2">
                                (Bs {inv.amount} @ {inv.rate})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-stone-800">${usd.toFixed(2)}</span>
                            <button
                              onClick={() => handleDeleteInvoice(inv.id)}
                              className="text-stone-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Categorized Ingredient List */}
            {CATEGORIES.map((cat) => {
              const items = BASE_INGREDIENTS.filter((i) => i.category === cat);
              return (
                <div key={cat} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                  <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-200 font-bold text-sm text-stone-700">
                    {cat}
                  </div>
                  <div className="divide-y divide-stone-100">
                    {items.map((item) => {
                      const st = globalConfig.itemsState?.[item.id] || {};
                      const enabled = item.optional ? st.enabled !== false : true;
                      const factor = item.scaleBy === 'hallacas' ? hallacasFactor : equivFactor;
                      const { display, exact } = formatQty(item, factor);
                      const usdVal = toUSD(st.amount, st.currency || 'USD', st.rate, refRate);

                      return (
                        <div
                          key={item.id}
                          className={`px-4 py-3 flex flex-wrap items-center justify-between gap-3 ${
                            !enabled ? 'opacity-45 bg-stone-50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <input
                              type="checkbox"
                              checked={Boolean(st.checked)}
                              disabled={!enabled}
                              onChange={(e) => updateItemState(item.id, { checked: e.target.checked })}
                              className="w-4 h-4 accent-amber-600 rounded"
                            />
                            <div>
                              <div className={`text-sm font-medium ${st.checked ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                                {item.name}
                              </div>
                              <div className="text-xs text-amber-800 font-semibold">
                                {display}
                                {exact && <span className="text-stone-400 font-normal ml-1.5">({exact})</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {item.optional && (
                              <button
                                onClick={() => updateItemState(item.id, { enabled: !enabled })}
                                className={`text-xs px-2 py-1 rounded-lg border ${
                                  enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-stone-200 text-stone-500'
                                }`}
                              >
                                {enabled ? 'Incluido' : 'Omitido'}
                              </button>
                            )}

                            {globalConfig.costMode !== 'invoices' && enabled && (
                              <>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="Costo"
                                  value={st.amount ?? ''}
                                  onChange={(e) => updateItemState(item.id, { amount: e.target.value })}
                                  className="w-20 px-2 py-1 rounded-lg border border-stone-200 text-xs"
                                />
                                <select
                                  value={st.currency || 'USD'}
                                  onChange={(e) =>
                                    updateItemState(item.id, {
                                      currency: e.target.value,
                                      rate: st.rate || refRate,
                                    })
                                  }
                                  className="px-1.5 py-1 rounded-lg border border-stone-200 text-xs bg-stone-50"
                                >
                                  <option value="USD">$</option>
                                  <option value="BS">Bs</option>
                                </select>
                                {st.currency === 'BS' && (
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Tasa"
                                    value={st.rate ?? refRate}
                                    onChange={(e) => updateItemState(item.id, { rate: e.target.value })}
                                    className="w-16 px-1.5 py-1 rounded-lg border border-amber-200 text-xs"
                                    title="Tasa congelada de esta compra"
                                  />
                                )}
                                <select
                                  value={st.payerId || ''}
                                  onChange={(e) => updateItemState(item.id, { payerId: e.target.value })}
                                  className="px-1.5 py-1 rounded-lg border border-stone-200 text-xs bg-white max-w-[115px]"
                                >
                                  <option value="">Pagó...</option>
                                  {groups.map((g) => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                  ))}
                                </select>
                                {usdVal > 0 && (
                                  <span className="text-xs font-bold text-stone-700 w-14 text-right">
                                    ${usdVal.toFixed(2)}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Custom Items */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm space-y-3">
              <h3 className="font-bold text-sm text-stone-700">Ítems extra personalizados</h3>
              <form onSubmit={handleAddCustomItem} className="flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Ej. Bolsas de hielo"
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  className="flex-1 min-w-[160px] px-3 py-1.5 rounded-xl border border-stone-200 text-sm"
                />
                <input
                  type="text"
                  placeholder="Cantidad"
                  value={newCustomQty}
                  onChange={(e) => setNewCustomQty(e.target.value)}
                  className="w-28 px-3 py-1.5 rounded-xl border border-stone-200 text-sm"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-stone-800 text-white text-sm font-semibold"
                >
                  Añadir
                </button>
              </form>
              {customItems.map((ci) => (
                <div key={ci.id} className="flex items-center justify-between text-sm pt-2 border-t border-stone-100">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(ci.checked)}
                      onChange={(e) => updateDoc(docPath('hallacas_custom_items', ci.id), { checked: e.target.checked })}
                      className="accent-amber-600"
                    />
                    <span className={ci.checked ? 'line-through text-stone-400' : ''}>
                      {ci.name} <span className="text-xs text-stone-500">({ci.qty})</span>
                    </span>
                  </label>
                  <button
                    onClick={() => deleteDoc(docPath('hallacas_custom_items', ci.id))}
                    className="text-stone-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: OTRAS COMPRAS */}
        {activeTab === 'otras' && (
          <div className="space-y-4">
            <form
              onSubmit={handleAddOtherExpense}
              className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm space-y-4"
            >
              <h2 className="font-bold text-stone-800 text-base">
                Registrar compra aparte (ej. Muchacho redondo, Pan de jamón, Bebidas)
              </h2>
              <div className="grid sm:grid-cols-5 gap-2.5">
                <input
                  type="text"
                  placeholder="Descripción"
                  value={otherDesc}
                  onChange={(e) => setOtherDesc(e.target.value)}
                  className="sm:col-span-2 px-3 py-2 rounded-xl border border-stone-200 text-sm"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Monto"
                  value={otherAmount}
                  onChange={(e) => setOtherAmount(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-stone-200 text-sm"
                />
                <select
                  value={otherCurrency}
                  onChange={(e) => setOtherCurrency(e.target.value)}
                  className="px-2.5 py-2 rounded-xl border border-stone-200 text-sm"
                >
                  <option value="USD">USD ($)</option>
                  <option value="BS">Bs</option>
                </select>
                {otherCurrency === 'BS' ? (
                  <input
                    type="number"
                    step="0.01"
                    placeholder={`Tasa (${refRate})`}
                    value={otherRate}
                    onChange={(e) => setOtherRate(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-amber-300 text-sm"
                  />
                ) : (
                  <select
                    value={otherPayer}
                    onChange={(e) => setOtherPayer(e.target.value)}
                    className="px-2.5 py-2 rounded-xl border border-stone-200 text-sm"
                  >
                    <option value="">¿Quién pagó?</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {otherCurrency === 'BS' && (
                <div>
                  <select
                    value={otherPayer}
                    onChange={(e) => setOtherPayer(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-stone-200 text-sm"
                  >
                    <option value="">¿Quién pagó?</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-600">
                    Porcentaje por familia (Total: <span className={Math.abs(otherSplitTotal - 100) <= 0.5 ? 'text-emerald-600' : 'text-red-600'}>{otherSplitTotal.toFixed(1)}%</span>)
                  </span>
                  <button
                    type="button"
                    onClick={handleDivideEqualOther}
                    className="text-xs px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-semibold hover:bg-amber-200"
                  >
                    Dividir en partes iguales
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {groups.map((g) => (
                    <div key={g.id} className="flex items-center justify-between bg-stone-50 px-3 py-2 rounded-xl border border-stone-100">
                      <span className="text-sm font-medium text-stone-700">{g.name}</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={otherSplits[g.id] ?? 0}
                          onChange={(e) =>
                            setOtherSplits((prev) => ({ ...prev, [g.id]: parseFloat(e.target.value) || 0 }))
                          }
                          className="w-16 px-2 py-1 rounded-lg border border-stone-200 bg-white text-right text-sm font-semibold"
                        />
                        <span className="text-xs text-stone-500">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={Math.abs(otherSplitTotal - 100) > 0.5}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-sm font-semibold"
              >
                Guardar compra aparte
              </button>
            </form>

            <div className="space-y-2.5">
              {otherExpenses.map((exp) => {
                const usd = toUSD(exp.amount, exp.currency, exp.rate, refRate);
                const payerName = groups.find((g) => g.id === exp.payerId)?.name || 'Sin asignar';
                return (
                  <div key={exp.id} className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-stone-800">{exp.description}</h3>
                        <p className="text-xs text-stone-500">
                          Pagó: <strong>{payerName}</strong>
                          {exp.currency === 'BS' && ` • Bs ${exp.amount} @ ${exp.rate}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-amber-800">${usd.toFixed(2)}</span>
                        <button
                          onClick={() => deleteDoc(docPath('hallacas_other_expenses', exp.id))}
                          className="text-stone-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {groups.map((g) => {
                        const pct = Number(exp.splits?.[g.id]) || 0;
                        if (pct <= 0) return null;
                        return (
                          <span key={g.id} className="text-xs bg-stone-100 text-stone-700 px-2.5 py-1 rounded-lg">
                            {g.name}: {pct}% (${(usd * (pct / 100)).toFixed(2)})
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: DIVISIÓN Y WHATSAPP */}
        {activeTab === 'division' && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
                <div className="text-xs text-stone-500">Total Hallacas</div>
                <div className="text-2xl font-bold text-stone-800">${hallacaFinancials.totalUSD.toFixed(2)}</div>
                <div className="text-xs text-stone-400 mt-1">
                  {totals.equiv > 0
                    ? `$${(hallacaFinancials.totalUSD / totals.equiv).toFixed(2)} / hallaca • $${((hallacaFinancials.totalUSD / totals.equiv) * 0.5).toFixed(2)} / bollo`
                    : 'Sin pedidos'}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
                <div className="text-xs text-stone-500">Otras Compras</div>
                <div className="text-2xl font-bold text-stone-800">${settlement.totalOtherUSD.toFixed(2)}</div>
                <div className="text-xs text-stone-400 mt-1">
                  Bs {(settlement.totalOtherUSD * refRate).toFixed(2)}
                </div>
              </div>
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 shadow-sm">
                <div className="text-xs text-amber-800 font-medium">Total General</div>
                <div className="text-2xl font-bold text-amber-900">${settlement.grandTotalUSD.toFixed(2)}</div>
                <div className="text-xs text-amber-700 mt-1">
                  Bs {(settlement.grandTotalUSD * refRate).toFixed(2)} (a tasa {refRate})
                </div>
              </div>
            </div>

            {/* Balance table */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-x-auto shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-stone-50 text-xs text-stone-500 uppercase border-b border-stone-200">
                  <tr>
                    <th className="px-4 py-3">Familia</th>
                    <th className="px-4 py-3 text-right">Hallacas</th>
                    <th className="px-4 py-3 text-right">Otras</th>
                    <th className="px-4 py-3 text-right">Total a aportar</th>
                    <th className="px-4 py-3 text-right">Ya pagó</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {settlement.rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 font-semibold text-stone-800">
                        {r.name}
                        <div className="text-xs font-normal text-stone-400">
                          {r.hallacas}h • {r.bollos}b ({r.sharePct.toFixed(1)}%)
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">${r.hallacasOwed.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">${r.otherOwed.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-bold">${r.totalOwed.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-emerald-700">${r.totalPaid.toFixed(2)}</td>
                      <td
                        className={`px-4 py-3 text-right font-bold ${
                          r.balance >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {r.balance >= 0 ? `+$${r.balance.toFixed(2)}` : `-$${Math.abs(r.balance).toFixed(2)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Splitwise transfers */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm space-y-3">
              <h3 className="font-bold text-stone-800 text-sm">Liquidación Inteligente (Quién le transfiere a quién)</h3>
              {settlement.transfers.length === 0 ? (
                <p className="text-sm text-stone-500">
                  Asigna quién pagó cada compra o factura para calcular las transferencias automáticamente.
                </p>
              ) : (
                <div className="space-y-2">
                  {settlement.transfers.map((t, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-center justify-between gap-2 bg-emerald-50/70 border border-emerald-200 rounded-xl px-4 py-3"
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
                        <span>{t.from}</span>
                        <ArrowRight className="w-4 h-4 text-emerald-600" />
                        <span>{t.to}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-800">${t.amount.toFixed(2)}</div>
                        <div className="text-xs text-emerald-700">Bs {(t.amount * refRate).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* WhatsApp export buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={copySummaryWhatsApp}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                <Copy className="w-4 h-4" /> Copiar Resumen y División para WhatsApp
              </button>
              <button
                onClick={copyShoppingList}
                className="py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                <Copy className="w-4 h-4" /> Copiar Lista de Compras
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
