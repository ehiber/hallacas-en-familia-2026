import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ChevronDown,
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

// Receta base: 50 hallacas + 12 bollos
const BASE_HALLACAS = 50;
const BASE_BOLLOS = 12;
// Masa/armado: el bollo usa ~media hallaca de masa/hoja
const BOLLO_MASA = 0.5;
// Relleno/guiso: el bollo casi no lleva relleno (0.1–0.2); usamos 0.15
const BOLLO_RELLENO = 0.15;
// Costo / participación familiar (unidad de pedido)
const BOLLO_COSTO = 0.5;

const BASE_MASA = BASE_HALLACAS + BASE_BOLLOS * BOLLO_MASA; // 56
const BASE_RELLENO = BASE_HALLACAS + BASE_BOLLOS * BOLLO_RELLENO; // 51.8
const BASE_EQUIV = BASE_MASA; // alias para participación/costo (bollo = 0.5)

const INITIAL_GROUPS = [
  { name: 'Flia Arbona Moreno', hallacas: 20, bollos: 0 },
  { name: 'Flia Arbona Arbona', hallacas: 20, bollos: 0 },
  { name: 'Los Pacitas', hallacas: 30, bollos: 0 },
  { name: 'Moreno Chacón', hallacas: 30, bollos: 0 },
];

const BASE_INGREDIENTS = [
  // Masa y Armado → bollo cuenta ~0.5
  { id: 'hojas', category: 'Masa y Armado', name: 'Hojas de plátano', baseQty: 5, unit: 'kg', type: 'weight_kg', scaleBy: 'masa' },
  { id: 'harina', category: 'Masa y Armado', name: 'Harina de maíz precocida', baseQty: 1.5, unit: 'paquete', unitPlural: 'paquetes', type: 'indivisible', scaleBy: 'masa' },
  { id: 'onoto', category: 'Masa y Armado', name: 'Onoto (en grano o molido)', baseQty: 100, unit: 'g', type: 'weight_g', scaleBy: 'masa' },
  { id: 'pabilo', category: 'Masa y Armado', name: 'Pabilo', baseQty: 2, unit: 'rollo', unitPlural: 'rollos', type: 'indivisible', scaleBy: 'masa' },
  { id: 'aceite', category: 'Masa y Armado', name: 'Aceite vegetal (onotado y sofrito)', baseQty: 1, unit: 'litro', unitPlural: 'litros', type: 'indivisible', scaleBy: 'masa' },

  // Carnes / relleno → bollo cuenta ~0.15 (casi sin relleno)
  { id: 'res', category: 'Carnes', name: 'Carne de res', baseQty: 2, unit: 'kg', type: 'weight_kg', scaleBy: 'relleno' },
  { id: 'cochino', category: 'Carnes', name: 'Cochino (cerdo)', baseQty: 1.5, unit: 'kg', type: 'weight_kg', scaleBy: 'relleno' },
  { id: 'tocino', category: 'Carnes', name: 'Tocino', baseQty: 100, unit: 'g', type: 'weight_g', scaleBy: 'relleno' },

  // Aliños y Sofrito → relleno
  { id: 'cebolla', category: 'Aliños y Sofrito', name: 'Cebollas redondas', baseQty: 4, unit: 'unidad', unitPlural: 'unidades', type: 'indivisible', scaleBy: 'relleno' },
  { id: 'ajoporro', category: 'Aliños y Sofrito', name: 'Ajoporro', baseQty: 1, unit: 'unidad', unitPlural: 'unidades', type: 'indivisible', scaleBy: 'relleno' },
  { id: 'cebollin', category: 'Aliños y Sofrito', name: 'Cebollines grandes', baseQty: 5, unit: 'unidad', unitPlural: 'unidades', type: 'indivisible', scaleBy: 'relleno' },
  { id: 'celery', category: 'Aliños y Sofrito', name: 'Tallos de celery (apio España)', baseQty: 4, unit: 'tallo', unitPlural: 'tallos', type: 'indivisible', scaleBy: 'relleno' },
  { id: 'ajo', category: 'Aliños y Sofrito', name: 'Cabezas de ajo', baseQty: 3, unit: 'cabeza', unitPlural: 'cabezas', type: 'indivisible', scaleBy: 'relleno' },
  { id: 'alcaparras_guiso', category: 'Aliños y Sofrito', name: 'Alcaparras trituradas (guiso)', baseQty: 100, unit: 'g', type: 'weight_g', scaleBy: 'relleno' },
  { id: 'aji_dulce', category: 'Aliños y Sofrito', name: 'Ajíes dulces', baseQty: 8, unit: 'unidad', unitPlural: 'unidades', type: 'indivisible', scaleBy: 'relleno' },
  { id: 'pimenton_guiso', category: 'Aliños y Sofrito', name: 'Pimentones rojos (guiso)', baseQty: 3, unit: 'unidad', unitPlural: 'unidades', type: 'indivisible', scaleBy: 'relleno' },
  { id: 'tomate', category: 'Aliños y Sofrito', name: 'Tomates maduros', baseQty: 4, unit: 'unidad', unitPlural: 'unidades', type: 'indivisible', scaleBy: 'relleno' },

  // Líquidos y Sazón → relleno
  { id: 'vino', category: 'Líquidos y Sazón', name: 'Vino para cocinar / tinto', baseQty: 1, unit: 'botella', unitPlural: 'botellas', type: 'indivisible', scaleBy: 'relleno' },
  { id: 'papelon', category: 'Líquidos y Sazón', name: 'Papelón', baseQty: 250, unit: 'g', type: 'weight_g', scaleBy: 'relleno' },
  { id: 'encurtidos', category: 'Líquidos y Sazón', name: 'Encurtidos en vinagre', baseQty: 250, unit: 'g', type: 'weight_g', scaleBy: 'relleno' },
  { id: 'caldo', category: 'Líquidos y Sazón', name: 'Caldo (tazas / cubitos)', baseQty: 2, unit: 'taza', unitPlural: 'tazas', type: 'indivisible', scaleBy: 'relleno' },
  { id: 'sal_pimienta', category: 'Líquidos y Sazón', name: 'Sal y pimienta (al gusto)', baseQty: 1, unit: 'al gusto', type: 'fixed', scaleBy: 'relleno' },

  // Adornos → solo hallacas (opcionales)
  { id: 'aceitunas', category: 'Adornos (Opcionales)', name: 'Aceitunas rellenas', baseQty: 300, unit: 'g', type: 'weight_g', scaleBy: 'hallacas', optional: true },
  { id: 'pasas', category: 'Adornos (Opcionales)', name: 'Pasas', baseQty: 200, unit: 'g', type: 'weight_g', scaleBy: 'hallacas', optional: true },
  { id: 'alcaparras_adorno', category: 'Adornos (Opcionales)', name: 'Alcaparras enteras (adorno)', baseQty: 100, unit: 'g', type: 'weight_g', scaleBy: 'hallacas', optional: true },
  { id: 'pimenton_tiras', category: 'Adornos (Opcionales)', name: 'Pimentón rojo en tiras', baseQty: 2, unit: 'unidad', unitPlural: 'unidades', type: 'indivisible', scaleBy: 'hallacas', optional: true },
  { id: 'cebolla_aros', category: 'Adornos (Opcionales)', name: 'Cebolla en aros', baseQty: 2, unit: 'unidad', unitPlural: 'unidades', type: 'indivisible', scaleBy: 'hallacas', optional: true },
];

function ingredientFactor(scaleBy, totals, mermaMult) {
  const masa = totals.hallacas + totals.bollos * BOLLO_MASA;
  const relleno = totals.hallacas + totals.bollos * BOLLO_RELLENO;
  if (scaleBy === 'hallacas') return (totals.hallacas / BASE_HALLACAS) * mermaMult;
  if (scaleBy === 'relleno') return (relleno / BASE_RELLENO) * mermaMult;
  // 'masa' o legacy 'equiv'
  return (masa / BASE_MASA) * mermaMult;
}

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

/** Legacy payerId → payers[]; empty amount means "paid the full total". */
function resolvePayers(record = {}) {
  if (Array.isArray(record.payers) && record.payers.length > 0) {
    return record.payers.map((p) => ({
      groupId: p.groupId || '',
      amount: p.amount ?? '',
    }));
  }
  if (record.payerId) return [{ groupId: record.payerId, amount: '' }];
  return [];
}

/** Convert payers into USD contributions per group. */
function payerContributions(payers, totalUSD, currency, rate, fallbackRate) {
  const list = (payers || []).filter((p) => p.groupId);
  if (list.length === 0) return [];

  const withExplicit = list.filter((p) => parseFloat(p.amount) > 0);
  if (withExplicit.length === 0 && list.length === 1) {
    return [{ groupId: list[0].groupId, usd: totalUSD }];
  }

  return withExplicit.map((p) => ({
    groupId: p.groupId,
    usd: toUSD(p.amount, currency || 'USD', rate, fallbackRate),
  }));
}

function formatPayersSummary(payers, groups, currency = 'USD') {
  const list = (payers || []).filter((p) => p.groupId);
  if (list.length === 0) return '';
  const symbol = currency === 'BS' ? 'Bs' : '$';
  return list
    .map((p) => {
      const name = groups.find((g) => g.id === p.groupId)?.name || '?';
      const amt = parseFloat(p.amount);
      return Number.isFinite(amt) && amt > 0 ? `${name} ${symbol}${amt}` : name;
    })
    .join(' · ');
}

function Select({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar',
  size = 'md',
  className = '',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selected = options.find((o) => String(o.value) === String(value));
  const triggerClass = size === 'sm' ? 'select-trigger-sm' : 'select-trigger';

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`${triggerClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={`truncate ${selected ? '' : 'text-stone-400'}`}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-stone-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="select-menu">
          {placeholder && (
            <button
              type="button"
              className={`select-option ${!value ? 'select-option-active' : ''}`}
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              {placeholder}
            </button>
          )}
          {options.map((o) => (
            <button
              key={String(o.value)}
              type="button"
              className={`select-option ${String(o.value) === String(value) ? 'select-option-active' : ''}`}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PayersControl({
  groups,
  payers = [],
  onChange,
  totalAmount,
  currency = 'USD',
  compact = false,
}) {
  const [open, setOpen] = useState(!compact);
  const total = parseFloat(totalAmount) || 0;
  const paidSum = payers.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const remaining = total > 0 ? total - paidSum : 0;
  const symbol = currency === 'BS' ? 'Bs' : '$';
  const summary = formatPayersSummary(payers, groups, currency);
  const usedIds = new Set(payers.map((p) => p.groupId).filter(Boolean));

  const updateRow = (idx, patch) => {
    onChange(payers.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const removeRow = (idx) => onChange(payers.filter((_, i) => i !== idx));

  const addRow = () => {
    const next = groups.find((g) => !usedIds.has(g.id));
    if (!next) return;
    const amount = remaining > 0.009 ? Number(remaining.toFixed(2)) : '';
    onChange([...payers, { groupId: next.id, amount }]);
    if (compact) setOpen(true);
  };

  const fillOne = (groupId) => {
    onChange([{ groupId, amount: total > 0 ? Number(total.toFixed(2)) : '' }]);
    if (compact) setOpen(true);
  };

  const editor = (
    <div className={`space-y-2 ${compact ? 'pt-2' : ''}`}>
      {payers.length === 0 && (
        <p className="text-xs text-stone-500">
          Puedes repartir el pago entre varias familias con montos distintos.
        </p>
      )}
      {payers.map((p, idx) => {
        const opts = groups
          .filter((g) => g.id === p.groupId || !usedIds.has(g.id))
          .map((g) => ({ value: g.id, label: g.name }));
        return (
          <div key={idx} className="flex flex-wrap items-center gap-2">
            <Select
              size={compact ? 'sm' : 'md'}
              className="flex-1 min-w-[140px]"
              value={p.groupId}
              onChange={(v) => updateRow(idx, { groupId: v })}
              options={opts}
              placeholder="Familia"
            />
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 pointer-events-none">
                {symbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder={payers.length === 1 && total > 0 ? String(total) : 'Monto'}
                value={p.amount}
                onChange={(e) => updateRow(idx, { amount: e.target.value })}
                className={`${compact ? 'field-sm' : 'field'} w-[7.5rem] pl-7`}
              />
            </div>
            <button
              type="button"
              onClick={() => removeRow(idx)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition"
              title="Quitar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addRow}
          disabled={usedIds.size >= groups.length}
          className="btn-ghost disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5" /> Agregar quien pagó
        </button>
        {groups.length > 0 && payers.length === 0 && (
          <Select
            size="sm"
            className="min-w-[160px]"
            value=""
            onChange={(v) => v && fillOne(v)}
            options={groups.map((g) => ({ value: g.id, label: g.name }))}
            placeholder="O asignar a uno solo"
          />
        )}
      </div>

      {total > 0 && (
        <div
          className={`text-xs font-medium ${
            Math.abs(remaining) < 0.02
              ? 'text-emerald-700'
              : remaining > 0
                ? 'text-amber-800'
                : 'text-red-600'
          }`}
        >
          {Math.abs(remaining) < 0.02
            ? `Cubierto: ${symbol}${total.toFixed(2)}`
            : remaining > 0
              ? `Restante: ${symbol}${remaining.toFixed(2)}`
              : `Excede por: ${symbol}${Math.abs(remaining).toFixed(2)}`}
        </div>
      )}
    </div>
  );

  if (!compact) {
    return (
      <div className="space-y-2">
        <div className="label-xs mb-0">¿Quién(es) pagó(aron)?</div>
        {editor}
      </div>
    );
  }

  return (
    <div className="w-full min-w-[180px] max-w-[280px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="select-trigger-sm w-full text-left"
      >
        <span className={`truncate ${summary ? 'text-stone-800' : 'text-stone-400'}`}>
          {summary || '¿Quién pagó?'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-stone-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-1.5 rounded-xl border border-stone-200 bg-gradient-to-b from-white to-stone-50 p-2.5 shadow-md shadow-stone-900/5">
          {editor}
        </div>
      )}
    </div>
  );
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
        className="min-w-8 min-h-8 w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 transition-all duration-150 active:scale-95"
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
        className="w-14 text-center font-semibold tabular-nums text-stone-800 bg-white border border-stone-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-emerald-600"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="min-w-8 min-h-8 w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-800 transition-all duration-150 active:scale-95"
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
  const [settlements, setSettlements] = useState([]); // liquidaciones registradas

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
  const [invPayers, setInvPayers] = useState([]);

  // Other expense form
  const [otherDesc, setOtherDesc] = useState('');
  const [otherAmount, setOtherAmount] = useState('');
  const [otherCurrency, setOtherCurrency] = useState('USD');
  const [otherRate, setOtherRate] = useState('');
  const [otherPayers, setOtherPayers] = useState([]);
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

    const unsubSettlements = onSnapshot(
      colPath('hallacas_settlements'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setSettlements(list);
      },
      (err) => setDbError(`Error leyendo liquidaciones: ${err.message}`)
    );

    return () => {
      unsubGroups();
      unsubConfig();
      unsubCustom();
      unsubOther();
      unsubSettlements();
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
    const equiv = hallacas + bollos * BOLLO_COSTO;
    const masa = hallacas + bollos * BOLLO_MASA;
    const relleno = hallacas + bollos * BOLLO_RELLENO;
    return { hallacas, bollos, equiv, masa, relleno };
  }, [groups]);

  const mermaMult = 1 + (Number(globalConfig.mermaPct) || 0) / 100;
  const refRate = Number(globalConfig.exchangeRate) || 50;

  // Total Hallacas Cost (USD) & Payers
  const hallacaFinancials = useMemo(() => {
    let totalUSD = 0;
    const paidByGroup = {};
    const addPaid = (contribs) => {
      contribs.forEach(({ groupId, usd }) => {
        if (!groupId || usd <= 0) return;
        paidByGroup[groupId] = (paidByGroup[groupId] || 0) + usd;
      });
    };

    if (globalConfig.costMode === 'invoices') {
      (globalConfig.hallacaInvoices || []).forEach((inv) => {
        const usd = toUSD(inv.amount, inv.currency, inv.rate, refRate);
        totalUSD += usd;
        addPaid(payerContributions(resolvePayers(inv), usd, inv.currency, inv.rate, refRate));
      });
    } else {
      const state = globalConfig.itemsState || {};
      BASE_INGREDIENTS.forEach((item) => {
        const st = state[item.id] || {};
        if (item.optional && st.enabled === false) return;
        const currency = st.currency || 'USD';
        const usd = toUSD(st.amount, currency, st.rate, refRate);
        totalUSD += usd;
        addPaid(payerContributions(resolvePayers(st), usd, currency, st.rate, refRate));
      });
      customItems.forEach((ci) => {
        const currency = ci.currency || 'USD';
        const usd = toUSD(ci.amount, currency, ci.rate, refRate);
        totalUSD += usd;
        addPaid(payerContributions(resolvePayers(ci), usd, currency, ci.rate, refRate));
      });
    }

    return { totalUSD, paidByGroup };
  }, [globalConfig, customItems, refRate]);

  // Splitwise Settlement
  const settlement = useMemo(() => {
    // A paga a B → A suma al aporte neto, B resta (le devolvieron)
    const settlementNet = {};
    settlements.forEach((s) => {
      const amt = parseFloat(s.amount) || 0;
      if (amt <= 0 || !s.fromId || !s.toId) return;
      settlementNet[s.fromId] = (settlementNet[s.fromId] || 0) + amt;
      settlementNet[s.toId] = (settlementNet[s.toId] || 0) - amt;
    });

    const rows = groups.map((g) => {
      const gEquiv = (Number(g.hallacas) || 0) + (Number(g.bollos) || 0) * BOLLO_COSTO;
      const sharePct = totals.equiv > 0 ? gEquiv / totals.equiv : 0;
      const hallacasOwed = hallacaFinancials.totalUSD * sharePct;
      const hallacasPaid = hallacaFinancials.paidByGroup[g.id] || 0;

      let otherOwed = 0;
      let otherPaid = 0;
      otherExpenses.forEach((exp) => {
        const expUSD = toUSD(exp.amount, exp.currency, exp.rate, refRate);
        const pct = Number(exp.splits?.[g.id]) || 0;
        otherOwed += expUSD * (pct / 100);
        const contribs = payerContributions(resolvePayers(exp), expUSD, exp.currency, exp.rate, refRate);
        contribs.forEach((c) => {
          if (c.groupId === g.id) otherPaid += c.usd;
        });
      });

      const purchasePaid = hallacasPaid + otherPaid;
      const settledNet = settlementNet[g.id] || 0;
      const totalOwed = hallacasOwed + otherOwed;
      const totalPaid = purchasePaid + settledNet;
      const balance = totalPaid - totalOwed; // > 0 receives, < 0 owes

      return {
        ...g,
        gEquiv,
        sharePct: sharePct * 100,
        hallacasOwed,
        otherOwed,
        totalOwed,
        purchasePaid,
        settledNet,
        totalPaid,
        balance,
      };
    });

    // Simplify debts between families that have assigned payers
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
        transfers.push({
          fromId: debtors[i].id,
          from: debtors[i].name,
          toId: creditors[j].id,
          to: creditors[j].name,
          amount: amt,
        });
      }
      debtors[i].amount -= amt;
      creditors[j].amount -= amt;
      if (debtors[i].amount < 0.01) i++;
      if (creditors[j].amount < 0.01) j++;
    }

    // What remains after family↔family transfers = costs with no payer assigned
    const unsettledDebts = debtors
      .filter((d) => d.amount > 0.01)
      .map((d) => ({ name: d.name, amount: d.amount }));
    const unsettledTotal = unsettledDebts.reduce((s, d) => s + d.amount, 0);

    const purchasePaidAll = rows.reduce((s, r) => s + r.purchasePaid, 0);
    const totalOwedAll = rows.reduce((s, r) => s + r.totalOwed, 0);
    const unassignedUSD = Math.max(0, totalOwedAll - purchasePaidAll);

    const hallacasPaidTotal = Object.values(hallacaFinancials.paidByGroup).reduce((s, v) => s + v, 0);
    const hallacasUnassigned = Math.max(0, hallacaFinancials.totalUSD - hallacasPaidTotal);

    const totalOtherUSD = otherExpenses.reduce(
      (s, e) => s + toUSD(e.amount, e.currency, e.rate, refRate),
      0
    );

    return {
      rows,
      transfers,
      unsettledDebts,
      unsettledTotal,
      unassignedUSD,
      hallacasUnassigned,
      totalOtherUSD,
      grandTotalUSD: hallacaFinancials.totalUSD + totalOtherUSD,
    };
  }, [groups, totals, hallacaFinancials, otherExpenses, settlements, refRate]);

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
    const cleanPayers = invPayers.filter((p) => p.groupId);
    const newInv = {
      id: Date.now().toString(),
      description: invDesc.trim(),
      amount: parseFloat(invAmount) || 0,
      currency: invCurrency,
      rate: invCurrency === 'BS' ? parseFloat(invRate) || refRate : refRate,
      payers: cleanPayers,
      payerId: cleanPayers[0]?.groupId || '',
    };
    await updateGlobal({
      hallacaInvoices: [...(globalConfig.hallacaInvoices || []), newInv],
    });
    setInvDesc('');
    setInvAmount('');
    setInvRate('');
    setInvPayers([]);
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
    const cleanPayers = otherPayers.filter((p) => p.groupId);
    await addDoc(colPath('hallacas_other_expenses'), {
      description: otherDesc.trim(),
      amount: parseFloat(otherAmount) || 0,
      currency: otherCurrency,
      rate: otherCurrency === 'BS' ? parseFloat(otherRate) || refRate : refRate,
      payers: cleanPayers,
      payerId: cleanPayers[0]?.groupId || '',
      splits: otherSplits,
      createdAt: Date.now(),
    });
    setOtherDesc('');
    setOtherAmount('');
    setOtherRate('');
    setOtherPayers([]);
  };

  const handleSettleTransfer = async (transfer) => {
    if (!transfer?.fromId || !transfer?.toId || !(transfer.amount > 0.01)) return;
    try {
      await addDoc(colPath('hallacas_settlements'), {
        fromId: transfer.fromId,
        toId: transfer.toId,
        amount: Number(transfer.amount.toFixed(2)),
        createdAt: Date.now(),
      });
      setCopiedMsg('Liquidación registrada');
      setTimeout(() => setCopiedMsg(''), 2500);
    } catch (err) {
      setDbError(`No se pudo liquidar: ${err.message}`);
    }
  };

  const handleSettleAll = async () => {
    if (!settlement.transfers.length) return;
    try {
      for (const t of settlement.transfers) {
        await addDoc(colPath('hallacas_settlements'), {
          fromId: t.fromId,
          toId: t.toId,
          amount: Number(t.amount.toFixed(2)),
          createdAt: Date.now(),
        });
      }
      setCopiedMsg('Todas las deudas marcadas como liquidadas');
      setTimeout(() => setCopiedMsg(''), 2500);
    } catch (err) {
      setDbError(`No se pudo liquidar: ${err.message}`);
    }
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
        const factor = ingredientFactor(item.scaleBy, totals, mermaMult);
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
      msg += `\n💸 *Por liquidar entre familias:*\n`;
      settlement.transfers.forEach((t) => {
        msg += `➡️ *${t.from}* → *${t.to}*: *$${t.amount.toFixed(2)}* (Bs ${(t.amount * refRate).toFixed(2)})\n`;
      });
    }
    if (settlements.length > 0) {
      msg += `\n✅ *Ya liquidado:*\n`;
      settlements.forEach((s) => {
        const from = groups.find((g) => g.id === s.fromId)?.name || '?';
        const to = groups.find((g) => g.id === s.toId)?.name || '?';
        msg += `• ${from} → ${to}: $${Number(s.amount).toFixed(2)}\n`;
      });
    }
    if (settlement.unassignedUSD > 0.01) {
      msg += `\n⚠️ *Falta asignar quién pagó:* $${settlement.unassignedUSD.toFixed(2)}`;
      if (settlement.hallacasUnassigned > 0.01) {
        msg += ` (hallacas sin pagador: $${settlement.hallacasUnassigned.toFixed(2)})`;
      }
      msg += `\nHasta asignarlo, esos saldos no se pueden liquidar entre familias.\n`;
      if (settlement.unsettledDebts?.length) {
        msg += `Pendiente:\n`;
        settlement.unsettledDebts.forEach((d) => {
          msg += `• ${d.name}: $${d.amount.toFixed(2)}\n`;
        });
      }
    }
    copyText(msg, 'Resumen copiado para WhatsApp');
  };

  // Config missing guard
  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
        <div className="max-w-md w-full card p-6 space-y-4">
          <div className="flex items-center gap-3 text-emerald-800">
            <AlertCircle className="w-7 h-7" />
            <h1 className="text-xl font-bold tracking-tight">Falta configurar Firebase</h1>
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-900">
        <form
          onSubmit={handleUnlock}
          className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-white/10 p-8 space-y-5"
        >
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-800">Hallacas en Familia 2026</h1>
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
              className="field text-center text-lg focus:ring-emerald-600"
              autoFocus
            />
            {passwordError && (
              <p className="text-xs text-rose-700 text-center mt-2">Clave incorrecta. Intenta de nuevo.</p>
            )}
          </div>
          <button type="submit" className="btn-primary w-full py-3">
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16 bg-stone-50">
      {/* Header */}
      <header className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-amber-400" />
                Hallacas en Familia 2026
              </h1>
              <p className="text-xs text-emerald-100/90 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                En vivo • Base de datos compartida
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-xl text-sm border border-white/10">
                <span className="text-emerald-100 text-xs font-medium">Tasa Bs/$:</span>
                <input
                  type="number"
                  step="0.01"
                  value={globalConfig.exchangeRate || ''}
                  onChange={(e) => updateGlobal({ exchangeRate: parseFloat(e.target.value) || 0 })}
                  className="w-20 bg-white/90 text-stone-900 font-semibold tabular-nums px-2 py-0.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('hallacas_unlocked');
                  setUnlocked(false);
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-150 active:scale-95"
                title="Bloquear"
              >
                <Unlock className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="kpi-tile">
              <div className="text-xs text-emerald-100/90 font-medium">Hallacas</div>
              <div className="text-xl font-bold tabular-nums">{totals.hallacas}</div>
            </div>
            <div className="kpi-tile">
              <div className="text-xs text-emerald-100/90 font-medium">Bollos</div>
              <div className="text-xl font-bold tabular-nums">{totals.bollos}</div>
            </div>
            <div className="kpi-tile">
              <div className="text-xs text-emerald-100/90 font-medium">Equiv. costo (bollo = {BOLLO_COSTO})</div>
              <div className="text-xl font-bold tabular-nums">{totals.equiv}</div>
            </div>
            <div className="kpi-tile">
              <div className="text-xs text-emerald-100/90 font-medium">Total General</div>
              <div className="text-xl font-bold tabular-nums">${settlement.grandTotalUSD.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Error banner */}
      {dbError && (
        <div className="max-w-5xl mx-auto px-4 mt-4">
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
            <span>{dbError}</span>
            <button onClick={() => setDbError('')} className="active:scale-95 transition-all duration-150"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Toast */}
      {copiedMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-sm font-medium animate-slide-up">
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
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                  active
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-white text-stone-600 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200'
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
          <div key="grupos" className="space-y-4 animate-fade-in">
            <form
              onSubmit={handleAddGroup}
              className="card p-4 flex flex-wrap gap-3 items-end"
            >
              <div className="flex-1 min-w-[180px]">
                <label className="label-xs">Nuevo grupo familiar</label>
                <input
                  type="text"
                  placeholder="Ej. Flia Pérez"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="field"
                />
              </div>
              <div className="w-24">
                <label className="label-xs">Hallacas</label>
                <input
                  type="number"
                  min="0"
                  value={newGroupHallacas}
                  onChange={(e) => setNewGroupHallacas(e.target.value)}
                  className="field tabular-nums"
                />
              </div>
              <div className="w-24">
                <label className="label-xs">Bollos</label>
                <input
                  type="number"
                  min="0"
                  value={newGroupBollos}
                  onChange={(e) => setNewGroupBollos(e.target.value)}
                  className="field tabular-nums"
                />
              </div>
              <button type="submit" className="btn-primary">
                <Plus className="w-4 h-4" /> Agregar
              </button>
            </form>

            {groups.length === 0 ? (
              <div className="card p-8 text-center space-y-3">
                <p className="text-stone-500 text-sm">No hay grupos familiares registrados.</p>
                <button onClick={handleRestoreInitial} className="btn-ghost mx-auto">
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
                      className="card-hover p-4 space-y-3"
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
                              className="field flex-1 py-1 border-emerald-400 font-semibold"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveGroupName(g.id)}
                              className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 active:scale-95 transition-all duration-150"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingGroupId(null)}
                              className="p-1.5 rounded-lg bg-stone-100 text-stone-600 active:scale-95 transition-all duration-150"
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
                            className="flex items-center gap-2 text-left font-bold tracking-tight text-stone-800 hover:text-emerald-800 group"
                          >
                            <span>{g.name}</span>
                            <Edit3 className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-700" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteDoc(docPath('hallacas_groups', g.id))}
                          className="p-1.5 text-stone-400 hover:text-rose-700 transition-all duration-150 active:scale-95"
                          title="Eliminar grupo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div>
                          <div className="label-xs">Hallacas</div>
                          <CountInput
                            label="hallacas"
                            value={Number(g.hallacas) || 0}
                            onChange={(val) => updateDoc(docPath('hallacas_groups', g.id), { hallacas: val })}
                          />
                        </div>
                        <div>
                          <div className="label-xs">Bollos</div>
                          <CountInput
                            label="bollos"
                            value={Number(g.bollos) || 0}
                            onChange={(val) => updateDoc(docPath('hallacas_groups', g.id), { bollos: val })}
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs font-medium text-stone-500">
                        <span>Participación: <strong className="text-stone-700 tabular-nums">{(row?.sharePct || 0).toFixed(1)}%</strong></span>
                        <span>Aporte total: <strong className="text-emerald-800 tabular-nums">${(row?.totalOwed || 0).toFixed(2)}</strong></span>
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
          <div key="compras" className="space-y-4 animate-fade-in">
            {/* Controls bar */}
            <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="badge-onoto">Merma</span>
                  <Select
                    size="sm"
                    className="w-[9.5rem]"
                    value={String(globalConfig.mermaPct || 0)}
                    onChange={(v) => updateGlobal({ mermaPct: Number(v) })}
                    options={[0, 5, 10, 15, 20].map((m) => ({
                      value: String(m),
                      label: m === 0 ? '0% (Sin merma)' : `+${m}%`,
                    }))}
                    placeholder=""
                  />
                </div>

                <div className="flex rounded-xl bg-stone-100 p-1 text-xs font-semibold">
                  <button
                    onClick={() => updateGlobal({ costMode: 'items' })}
                    className={`px-3 py-1.5 rounded-lg transition-all duration-150 active:scale-95 ${
                      globalConfig.costMode !== 'invoices' ? 'bg-white text-emerald-800 shadow-sm' : 'text-stone-500'
                    }`}
                  >
                    Costo por ítems
                  </button>
                  <button
                    onClick={() => updateGlobal({ costMode: 'invoices' })}
                    className={`px-3 py-1.5 rounded-lg transition-all duration-150 active:scale-95 ${
                      globalConfig.costMode === 'invoices' ? 'bg-white text-emerald-800 shadow-sm' : 'text-stone-500'
                    }`}
                  >
                    Total global / Facturas
                  </button>
                </div>
              </div>

              <button onClick={copyShoppingList} className="btn-whatsapp text-xs">
                <Copy className="w-4 h-4" /> Copiar Lista WhatsApp
              </button>
            </div>

            {/* Global Invoices Mode */}
            {globalConfig.costMode === 'invoices' && (
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-stone-50 p-4 space-y-3 shadow-sm">
                <h3 className="font-bold tracking-tight text-emerald-950 text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-500" /> Facturas / Pagos Globales de Hallacas
                </h3>
                <form onSubmit={handleAddInvoice} className="space-y-3">
                  <div className="grid sm:grid-cols-4 gap-2">
                    <input
                      type="text"
                      placeholder="Ej. Mercado carne y aliños"
                      value={invDesc}
                      onChange={(e) => setInvDesc(e.target.value)}
                      className="field sm:col-span-2"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Monto"
                      value={invAmount}
                      onChange={(e) => setInvAmount(e.target.value)}
                      className="field"
                    />
                    <Select
                      value={invCurrency}
                      onChange={setInvCurrency}
                      options={[
                        { value: 'USD', label: 'USD ($)' },
                        { value: 'BS', label: 'Bs' },
                      ]}
                      placeholder="Moneda"
                    />
                    {invCurrency === 'BS' && (
                      <input
                        type="number"
                        step="0.01"
                        placeholder={`Tasa (${refRate})`}
                        value={invRate}
                        onChange={(e) => setInvRate(e.target.value)}
                        className="field sm:col-span-2"
                      />
                    )}
                  </div>
                  <PayersControl
                    groups={groups}
                    payers={invPayers}
                    onChange={setInvPayers}
                    totalAmount={invAmount}
                    currency={invCurrency}
                  />
                  <button type="submit" className="btn-primary">
                    <Plus className="w-4 h-4" /> Agregar factura
                  </button>
                </form>

                {(globalConfig.hallacaInvoices || []).length > 0 && (
                  <div className="space-y-2 pt-2">
                    {(globalConfig.hallacaInvoices || []).map((inv) => {
                      const usd = toUSD(inv.amount, inv.currency, inv.rate, refRate);
                      const payerLabel =
                        formatPayersSummary(resolvePayers(inv), groups, inv.currency) || 'Sin asignar';
                      return (
                        <div
                          key={inv.id}
                          className="bg-white rounded-xl px-3 py-2.5 border border-amber-100/80 shadow-sm flex items-center justify-between gap-3 text-sm"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-stone-800">{inv.description}</span>
                            <div className="text-xs text-stone-500 mt-0.5 truncate">Pagaron: {payerLabel}</div>
                            {inv.currency === 'BS' && (
                              <span className="badge-onoto mt-1 inline-flex">
                                Bs {inv.amount} @ {inv.rate}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-bold text-stone-800 tabular-nums">${usd.toFixed(2)}</span>
                            <button
                              onClick={() => handleDeleteInvoice(inv.id)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-700 hover:bg-rose-50 active:scale-95 transition-all duration-150"
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
                <div key={cat} className="card overflow-hidden">
                  <div className="bg-stone-50/90 px-4 py-2.5 border-b border-stone-200 font-bold uppercase tracking-wider text-xs text-stone-700 border-l-4 border-l-emerald-700">
                    {cat}
                  </div>
                  <div className="divide-y divide-stone-100">
                    {items.map((item) => {
                      const st = globalConfig.itemsState?.[item.id] || {};
                      const enabled = item.optional ? st.enabled !== false : true;
                      const factor = ingredientFactor(item.scaleBy, totals, mermaMult);
                      const { display, exact } = formatQty(item, factor);
                      const usdVal = toUSD(st.amount, st.currency || 'USD', st.rate, refRate);

                      return (
                        <div
                          key={item.id}
                          className={`px-4 py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-stone-50/80 transition-colors duration-150 ${
                            !enabled ? 'opacity-45 bg-stone-50' : ''
                          } ${st.checked ? 'opacity-60' : ''}`}
                        >
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <input
                              type="checkbox"
                              checked={Boolean(st.checked)}
                              disabled={!enabled}
                              onChange={(e) => updateItemState(item.id, { checked: e.target.checked })}
                              className="w-4 h-4 accent-emerald-700 rounded"
                            />
                            <div>
                              <div className={`text-sm font-medium ${st.checked ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                                {item.name}
                              </div>
                              <div className="text-xs text-emerald-800 font-semibold tabular-nums">
                                {display}
                                {exact && <span className="text-stone-400 font-normal ml-1.5">({exact})</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {item.optional && (
                              <button
                                onClick={() => updateItemState(item.id, { enabled: !enabled })}
                                className={enabled ? 'badge-positive active:scale-95 transition-all duration-150' : 'badge-negative active:scale-95 transition-all duration-150'}
                              >
                                {enabled ? 'Incluido' : 'Omitido'}
                              </button>
                            )}

                            {globalConfig.costMode !== 'invoices' && enabled && (
                              <div className="flex flex-wrap items-start gap-2 justify-end">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="Costo"
                                  value={st.amount ?? ''}
                                  onChange={(e) => updateItemState(item.id, { amount: e.target.value })}
                                  className="field-sm w-[4.75rem]"
                                />
                                <Select
                                  size="sm"
                                  className="w-[4.5rem]"
                                  value={st.currency || 'USD'}
                                  onChange={(v) =>
                                    updateItemState(item.id, {
                                      currency: v,
                                      rate: st.rate || refRate,
                                    })
                                  }
                                  options={[
                                    { value: 'USD', label: '$' },
                                    { value: 'BS', label: 'Bs' },
                                  ]}
                                  placeholder="$"
                                />
                                {st.currency === 'BS' && (
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Tasa"
                                    value={st.rate ?? refRate}
                                    onChange={(e) => updateItemState(item.id, { rate: e.target.value })}
                                    className="field-sm w-16 border-amber-200"
                                    title="Tasa congelada de esta compra"
                                  />
                                )}
                                <PayersControl
                                  compact
                                  groups={groups}
                                  payers={resolvePayers(st)}
                                  totalAmount={st.amount}
                                  currency={st.currency || 'USD'}
                                  onChange={(next) =>
                                    updateItemState(item.id, {
                                      payers: next,
                                      payerId: next[0]?.groupId || '',
                                    })
                                  }
                                />
                                {usdVal > 0 && (
                                  <span className="text-xs font-bold text-stone-700 w-14 text-right pt-1.5 tabular-nums">
                                    ${usdVal.toFixed(2)}
                                  </span>
                                )}
                              </div>
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
            <div className="card p-4 space-y-3">
              <h3 className="font-bold tracking-tight text-sm text-stone-800">Ítems extra personalizados</h3>
              <form onSubmit={handleAddCustomItem} className="flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Ej. Bolsas de hielo"
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  className="field flex-1 min-w-[160px]"
                />
                <input
                  type="text"
                  placeholder="Cantidad"
                  value={newCustomQty}
                  onChange={(e) => setNewCustomQty(e.target.value)}
                  className="field w-28"
                />
                <button type="submit" className="btn-primary">
                  Añadir
                </button>
              </form>
              {customItems.map((ci) => (
                <div key={ci.id} className="flex items-center justify-between text-sm pt-2 border-t border-stone-100 hover:bg-stone-50/80 transition-colors duration-150 rounded-lg px-1">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(ci.checked)}
                      onChange={(e) => updateDoc(docPath('hallacas_custom_items', ci.id), { checked: e.target.checked })}
                      className="accent-emerald-700"
                    />
                    <span className={ci.checked ? 'line-through text-stone-400 opacity-60' : ''}>
                      {ci.name} <span className="text-xs text-stone-500">({ci.qty})</span>
                    </span>
                  </label>
                  <button
                    onClick={() => deleteDoc(docPath('hallacas_custom_items', ci.id))}
                    className="text-stone-400 hover:text-rose-700 active:scale-95 transition-all duration-150"
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
          <div key="otras" className="space-y-4 animate-fade-in">
            <form
              onSubmit={handleAddOtherExpense}
              className="card p-4 space-y-4"
            >
              <h2 className="font-bold tracking-tight text-stone-800 text-base">
                Registrar compra aparte (ej. Muchacho redondo, Pan de jamón, Bebidas)
              </h2>
              <div className="grid sm:grid-cols-4 gap-2.5">
                <input
                  type="text"
                  placeholder="Descripción"
                  value={otherDesc}
                  onChange={(e) => setOtherDesc(e.target.value)}
                  className="field sm:col-span-2"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Monto"
                  value={otherAmount}
                  onChange={(e) => setOtherAmount(e.target.value)}
                  className="field"
                />
                <Select
                  value={otherCurrency}
                  onChange={setOtherCurrency}
                  options={[
                    { value: 'USD', label: 'USD ($)' },
                    { value: 'BS', label: 'Bs' },
                  ]}
                  placeholder="Moneda"
                />
                {otherCurrency === 'BS' && (
                  <input
                    type="number"
                    step="0.01"
                    placeholder={`Tasa (${refRate})`}
                    value={otherRate}
                    onChange={(e) => setOtherRate(e.target.value)}
                    className="field sm:col-span-2 border-amber-200"
                  />
                )}
              </div>

              <PayersControl
                groups={groups}
                payers={otherPayers}
                onChange={setOtherPayers}
                totalAmount={otherAmount}
                currency={otherCurrency}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-medium text-stone-500">
                    Porcentaje por familia (Total:{' '}
                    <span className={`tabular-nums font-semibold ${Math.abs(otherSplitTotal - 100) <= 0.5 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {otherSplitTotal.toFixed(1)}%
                    </span>
                    )
                  </span>
                  <button type="button" onClick={handleDivideEqualOther} className="btn-onoto">
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
                          className="field-sm w-16 text-right font-semibold"
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
                className="btn-primary"
              >
                Guardar compra aparte
              </button>
            </form>

            <div className="space-y-2.5">
              {otherExpenses.map((exp) => {
                const usd = toUSD(exp.amount, exp.currency, exp.rate, refRate);
                const payerLabel =
                  formatPayersSummary(resolvePayers(exp), groups, exp.currency) || 'Sin asignar';
                return (
                  <div key={exp.id} className="card-hover p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-bold tracking-tight text-stone-800">{exp.description}</h3>
                        <p className="text-xs font-medium text-stone-500 truncate">
                          Pagaron: <strong className="text-stone-700">{payerLabel}</strong>
                          {exp.currency === 'BS' && (
                            <span className="badge-onoto ml-2 inline-flex">Bs {exp.amount} @ {exp.rate}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-lg font-bold text-emerald-800 tabular-nums">${usd.toFixed(2)}</span>
                        <button
                          onClick={() => deleteDoc(docPath('hallacas_other_expenses', exp.id))}
                          className="text-stone-400 hover:text-rose-700 active:scale-95 transition-all duration-150"
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
                          <span key={g.id} className="text-xs bg-stone-100 text-stone-700 px-2.5 py-1 rounded-lg tabular-nums">
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
          <div key="division" className="space-y-4 animate-fade-in">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="card p-4">
                <div className="text-xs font-medium text-stone-500">Total Hallacas</div>
                <div className="text-2xl font-bold tracking-tight text-stone-800 tabular-nums">${hallacaFinancials.totalUSD.toFixed(2)}</div>
                <div className="text-xs text-stone-400 mt-1 tabular-nums">
                  {totals.equiv > 0
                    ? `$${(hallacaFinancials.totalUSD / totals.equiv).toFixed(2)} / hallaca • $${((hallacaFinancials.totalUSD / totals.equiv) * 0.5).toFixed(2)} / bollo`
                    : 'Sin pedidos'}
                </div>
              </div>
              <div className="card p-4">
                <div className="text-xs font-medium text-stone-500">Otras Compras</div>
                <div className="text-2xl font-bold tracking-tight text-stone-800 tabular-nums">${settlement.totalOtherUSD.toFixed(2)}</div>
                <div className="text-xs text-stone-400 mt-1 tabular-nums">
                  Bs {(settlement.totalOtherUSD * refRate).toFixed(2)}
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
                <div className="text-xs text-emerald-800 font-medium">Total General</div>
                <div className="text-2xl font-bold tracking-tight text-emerald-950 tabular-nums">${settlement.grandTotalUSD.toFixed(2)}</div>
                <div className="text-xs text-emerald-700 mt-1 tabular-nums">
                  Bs {(settlement.grandTotalUSD * refRate).toFixed(2)} (a tasa {refRate})
                </div>
              </div>
            </div>

            {/* Balance table */}
            <div className="card overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-stone-50/90 text-xs text-stone-500 uppercase tracking-wider border-b border-stone-200">
                  <tr>
                    <th className="px-4 py-3 font-bold">Familia</th>
                    <th className="px-4 py-3 text-right font-bold">Hallacas</th>
                    <th className="px-4 py-3 text-right font-bold">Otras</th>
                    <th className="px-4 py-3 text-right font-bold">Total a aportar</th>
                    <th className="px-4 py-3 text-right font-bold">Ya pagó</th>
                    <th className="px-4 py-3 text-right font-bold">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {settlement.rows.map((r) => (
                    <tr key={r.id} className="hover:bg-stone-50/80 transition-colors duration-150">
                      <td className="px-4 py-3 font-semibold text-stone-800">
                        {r.name}
                        <div className="text-xs font-normal text-stone-400 tabular-nums">
                          {r.hallacas}h • {r.bollos}b ({r.sharePct.toFixed(1)}%)
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">${r.hallacasOwed.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">${r.otherOwed.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">${r.totalOwed.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-emerald-700 tabular-nums">
                        ${r.totalPaid.toFixed(2)}
                        {Math.abs(r.settledNet) > 0.01 && (
                          <div className="text-[10px] font-normal text-stone-400">
                            incl. liq. {r.settledNet >= 0 ? '+' : ''}{r.settledNet.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex font-bold tabular-nums px-2 py-0.5 rounded-lg border ${
                            r.balance >= 0
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {r.balance >= 0 ? `+$${r.balance.toFixed(2)}` : `-$${Math.abs(r.balance).toFixed(2)}`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Splitwise transfers */}
            <div className="card p-4 space-y-3">
              <h3 className="font-bold tracking-tight text-stone-800 text-sm">Liquidación Inteligente (Quién le transfiere a quién)</h3>
              <p className="text-xs text-stone-500">
                Solo mueve plata entre familias cuando hay alguien con saldo a favor (pagó de más) y otras que deben.
                Si un gasto no tiene “quién pagó”, ese monto no puede liquidarse aquí.
              </p>

              {settlement.unassignedUSD > 0.01 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-950 space-y-1">
                  <div className="font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Falta asignar quién pagó ${settlement.unassignedUSD.toFixed(2)}
                  </div>
                  {settlement.hallacasUnassigned > 0.01 && (
                    <p className="text-xs text-amber-800">
                      De hallacas hay <strong className="tabular-nums">${settlement.hallacasUnassigned.toFixed(2)}</strong> en costos
                      sin pagador. Ve a <strong>Lista de Compras</strong> y marca quién(es) pagó(aron) cada ítem o factura.
                    </p>
                  )}
                </div>
              )}

              {settlement.transfers.length === 0 && settlement.unassignedUSD <= 0.01 ? (
                <p className="text-sm text-stone-500">
                  {settlement.rows.every((r) => Math.abs(r.balance) < 0.01)
                    ? 'Todo está cuadrado: nadie se debe entre sí.'
                    : 'Asigna quién pagó cada compra o factura para calcular las transferencias automáticamente.'}
                </p>
              ) : settlement.transfers.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">Por liquidar entre familias</div>
                    {settlement.transfers.length > 1 && (
                      <button type="button" onClick={handleSettleAll} className="btn-ghost">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Liquidar todas
                      </button>
                    )}
                  </div>
                  {settlement.transfers.map((t, idx) => (
                    <div key={`${t.fromId}-${t.toId}-${idx}`} className="transfer-card group">
                      <div className="flex items-center gap-2 text-sm font-semibold text-stone-800 min-w-0">
                        <span className="truncate">{t.from}</span>
                        <ArrowRight className="w-4 h-4 text-emerald-600 transfer-arrow shrink-0" />
                        <span className="truncate">{t.to}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="font-bold text-emerald-800 tabular-nums">${t.amount.toFixed(2)}</div>
                          <div className="text-xs text-emerald-700 tabular-nums">Bs {(t.amount * refRate).toFixed(2)}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSettleTransfer(t)}
                          className="btn-primary text-xs py-1.5 px-3"
                          title="Registrar que este pago ya se hizo"
                        >
                          <Check className="w-3.5 h-3.5" /> Liquidar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {settlement.unsettledTotal > 0.01 && (
                <div className="space-y-2 pt-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Aún pendiente (${settlement.unsettledTotal.toFixed(2)}) — sin destinatario en el grupo
                  </div>
                  {settlement.unsettledDebts.map((d) => (
                    <div
                      key={d.name}
                      className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50/60 px-3.5 py-2.5 text-sm"
                    >
                      <span className="font-medium text-stone-800">{d.name}</span>
                      <span className="font-bold text-rose-700 tabular-nums">debe ${d.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <p className="text-xs text-stone-500">
                    Ese pendiente es el dinero de gastos sin “quién pagó”. Cuando asignes al pagador, aquí aparecerán
                    las transferencias completas (quién le paga a quién).
                  </p>
                </div>
              )}

              {settlements.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">Ya liquidado</div>
                  {settlements.map((s) => {
                    const from = groups.find((g) => g.id === s.fromId)?.name || '¿?';
                    const to = groups.find((g) => g.id === s.toId)?.name || '¿?';
                    return (
                      <div
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50/80 px-3.5 py-2.5 text-sm"
                      >
                        <div className="flex items-center gap-2 font-medium text-stone-700 min-w-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate">{from}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="truncate">{to}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-bold text-stone-800 tabular-nums">${Number(s.amount).toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => deleteDoc(docPath('hallacas_settlements', s.id))}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-700 hover:bg-rose-50 active:scale-95 transition-all duration-150"
                            title="Deshacer liquidación"
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

            {/* WhatsApp export buttons */}
            <div className="flex flex-wrap gap-3">
              <button onClick={copySummaryWhatsApp} className="btn-whatsapp flex-1 py-3">
                <Copy className="w-4 h-4" /> Copiar Resumen y División para WhatsApp
              </button>
              <button onClick={copyShoppingList} className="btn-secondary py-3 px-4 bg-stone-800 text-white hover:bg-stone-900 hover:text-white border-stone-800">
                <Copy className="w-4 h-4" /> Copiar Lista de Compras
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
