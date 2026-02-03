import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Avatar, Button, Space } from 'antd';
import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';
import './org.css';
import { OrgChildrenModal } from './OrgChildrenModal';
import type { OrgNode as ModalNode } from './OrgChildrenModal';

type Node = ModalNode;

/* ---------------- hook mobile ---------------- */
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const m = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const onChange = () => setIsMobile(m.matches);

    // safari fallback
    if ((m as any).addEventListener) (m as any).addEventListener('change', onChange);
    else (m as any).addListener(onChange);

    setIsMobile(m.matches);

    return () => {
      if ((m as any).removeEventListener) (m as any).removeEventListener('change', onChange);
      else (m as any).removeListener(onChange);
    };
  }, [breakpoint]);

  return isMobile;
}

/* ---------------- helpers ---------------- */
function normalizeRole(role?: string | null) {
  return String(role || '').trim().toLowerCase();
}
function shouldHideFromOrg(role?: string | null) {
  const r = normalizeRole(role);
  if (r.includes('analist')) return true;
  if (r.includes('admin')) return true;
  return false;
}
function isCoordinator(role?: string | null) {
  const r = normalizeRole(role);
  return r.includes('coorden') || r.includes('coordinator');
}
function isSupervisor(role?: string | null) {
  const r = normalizeRole(role);
  return r.includes('supervis');
}

function collectIdsByPredicate(root: Node, pred: (n: Node) => boolean) {
  const ids: number[] = [];
  const walk = (n: Node) => {
    if (pred(n)) ids.push(n.id);
    (n.children || []).forEach(walk);
  };
  walk(root);
  return ids;
}

/** Filtra árvore removendo nós e promovendo filhos */
function filterTree(arr: Node[]): Node[] {
  const walk = (n: Node): Node[] => {
    const nextChildren = (n.children || []).flatMap(walk);

    if (shouldHideFromOrg(n.role)) {
      return nextChildren; // promove filhos
    }
    return [{ ...n, children: nextChildren }];
  };

  return arr.flatMap(walk);
}

function countDesc(n?: Node): number {
  if (!n?.children || n.children.length === 0) return 0;
  let c = n.children.length;
  for (const ch of n.children) c += countDesc(ch);
  return c;
}
function collectDescCounts(arr: Node[]): Map<number, number> {
  const map = new Map<number, number>();
  const walk = (n: Node) => {
    map.set(n.id, countDesc(n));
    (n.children || []).forEach(walk);
  };
  arr.forEach(walk);
  return map;
}

/** encontra caminho até o id */
function findPathToId(roots: Node[], targetId: number): number[] | null {
  const stack: { node: Node; path: number[] }[] = roots.map((r) => ({ node: r, path: [r.id] }));
  while (stack.length) {
    const { node, path } = stack.pop()!;
    if (node.id === targetId) return path;
    const kids = node.children || [];
    for (let i = kids.length - 1; i >= 0; i--) {
      stack.push({ node: kids[i], path: [...path, kids[i].id] });
    }
  }
  return null;
}

/** drill map parent -> selected child */
function buildSelectedChildMap(drillPath: number[]) {
  const map = new Map<number, number>();
  for (let i = 0; i < drillPath.length - 1; i++) {
    map.set(drillPath[i], drillPath[i + 1]);
  }
  return map;
}

/** aplica drill: se existe seleção para este pai, mostra só o filho selecionado */
function applyDrill(children: Node[] | undefined, selectedChildMap: Map<number, number>, parentId: number) {
  const list = children || [];
  const selected = selectedChildMap.get(parentId);
  if (!selected) return list;
  return list.filter((c) => c.id === selected);
}

/* ---------------- Card ---------------- */
function OrgCard({
  n,
  hasChildren,
  isCollapsed,
  qty,
  onToggle,
}: {
  n: Node;
  hasChildren: boolean;
  isCollapsed: boolean;
  qty: number;
  onToggle: () => void;
}) {
  return (
    <div className="org-node" data-node-card>
      <Avatar size={64} src={n.avatarUrl || undefined}>
        {n.name?.[0]}
      </Avatar>

      <div className="org-meta">
        <div className="org-name">{n.name}</div>
        {n.role && <div className="org-role">{n.role}</div>}
      </div>

      {hasChildren && (
        <button
          className="org-toggle inside"
          aria-label={isCollapsed ? 'Expandir' : 'Recolher'}
          title={`${isCollapsed ? 'Expandir' : 'Recolher'} — ${qty} abaixo`}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          {isCollapsed ? <CaretRightOutlined /> : <CaretDownOutlined />}
          <span className="org-count">{qty}</span>
        </button>
      )}
    </div>
  );
}

/* ---------------- Branch ---------------- */
function Branch({
  n,
  collapsed,
  setCollapsed,
  descCounts,
  wrapRef,
  selectedChildMap,
  onDrillExpand,
  onDrillCollapse,
  isMobile,
}: {
  n: Node;
  collapsed: Set<number>;
  setCollapsed: React.Dispatch<React.SetStateAction<Set<number>>>;
  descCounts: Map<number, number>;
  wrapRef: React.RefObject<HTMLDivElement>;

  selectedChildMap: Map<number, number>;
  onDrillExpand: (id: number) => void;
  onDrillCollapse: (id: number) => void;

  isMobile: boolean;
}) {
  const childrenCount = n.children?.length ?? 0;
  const hasChildren = childrenCount > 0;
  const isCollapsed = collapsed.has(n.id);
  const qtyDesc = descCounts.get(n.id) ?? 0;

  const ulRef = useRef<HTMLUListElement>(null);
  const [rowCompact, setRowCompact] = useState(false);

  // ✅ no MOBILE não mede rowCompact (evita “tremedeira” e overflow)
  useEffect(() => {
    if (isMobile) {
      setRowCompact(false);
      return;
    }
    if (isCollapsed || !ulRef.current || !wrapRef.current) {
      setRowCompact(false);
      return;
    }
    if (childrenCount > 4) {
      setRowCompact(false);
      return;
    }

    const COMPACT_MARGIN_PX = 24;
    let raf = 0;

    const check = () => {
      raf = requestAnimationFrame(() => {
        const ul = ulRef.current;
        const wrap = wrapRef.current;
        if (!ul || !wrap) return;

        const rowWidth = ul.scrollWidth;
        const wrapWidth = wrap.clientWidth - 60;
        const overflow = rowWidth - wrapWidth;

        setRowCompact((prev) => {
          if (prev) return overflow > -COMPACT_MARGIN_PX;
          return overflow > COMPACT_MARGIN_PX;
        });
      });
    };

    check();
    const ro = new ResizeObserver(check);
    ro.observe(wrapRef.current);
    window.addEventListener('resize', check);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', check);
    };
  }, [isMobile, isCollapsed, childrenCount, wrapRef]);

  const handleToggle = () => {
    const willExpand = isCollapsed;

    if (willExpand) {
      setCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(n.id);
        return next;
      });
      onDrillExpand(n.id);
      return;
    }

    setCollapsed((prev) => {
      const next = new Set(prev);
      next.add(n.id);
      return next;
    });
    onDrillCollapse(n.id);
  };

  const drilledChildren = applyDrill(n.children, selectedChildMap, n.id);

  // desktop: supervisor com muitos vira grid 3; mobile: sempre coluna
  const isSup = isSupervisor(n.role);
  const grid3 = !isMobile && isSup && drilledChildren.length > 3;

  return (
    <li className={isCollapsed ? 'collapsed' : ''} data-node-id={n.id}>
      <div className="org-head">
        <OrgCard n={n} hasChildren={hasChildren} isCollapsed={isCollapsed} qty={qtyDesc} onToggle={handleToggle} />
      </div>

      {hasChildren && !isCollapsed && (
        <ul
          ref={ulRef}
          className={[
            isMobile ? 'children-mobile' : '',
            !isMobile && !grid3 && rowCompact ? 'row-compact' : '',
            !isMobile && grid3 ? 'grid-children-3' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {drilledChildren.map((c) => (
            <Branch
              key={c.id}
              n={c}
              collapsed={collapsed}
              setCollapsed={setCollapsed}
              descCounts={descCounts}
              wrapRef={wrapRef}
              selectedChildMap={selectedChildMap}
              onDrillExpand={onDrillExpand}
              onDrillCollapse={onDrillCollapse}
              isMobile={isMobile}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/* ---------------- Página ---------------- */
export function OrgPage() {
  const isMobile = useIsMobile(768);

  const { data, isLoading } = useQuery<Node[]>({
    queryKey: ['org'],
    queryFn: async () => (await api.get('/org/tree')).data,
  });

  const filteredData = useMemo(() => filterTree(data || []), [data]);

  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [drillPath, setDrillPath] = useState<number[]>([]);
  const selectedChildMap = useMemo(() => buildSelectedChildMap(drillPath), [drillPath]);
  const descCounts = useMemo(() => collectDescCounts(filteredData || []), [filteredData]);

  const wrapRef = useRef<HTMLDivElement>(null);

  // inicia colapsando filhos dos coordenadores
  const [didInitCollapse, setDidInitCollapse] = useState(false);
  useEffect(() => {
    if (!filteredData?.length || didInitCollapse) return;

    const toCollapse = new Set<number>();
    const walk = (n: Node) => {
      if (isCoordinator(n.role) && n.children?.length) toCollapse.add(n.id);
      n.children?.forEach(walk);
    };
    filteredData.forEach(walk);

    if (toCollapse.size) setCollapsed(toCollapse);
    setDidInitCollapse(true);
  }, [filteredData, didInitCollapse]);

  const onDrillExpand = (id: number) => {
    const path = findPathToId(filteredData, id);
    if (!path) return;

    setDrillPath(path);

    // se expandiu COORDENADOR: colapsa supervisores abaixo dele
    const findNode = (roots: Node[], targetId: number): Node | null => {
      const stack = [...roots];
      while (stack.length) {
        const n = stack.pop()!;
        if (n.id === targetId) return n;
        (n.children || []).forEach((c) => stack.push(c));
      }
      return null;
    };

    const node = findNode(filteredData, id);
    if (!node) return;

    if (isCoordinator(node.role)) {
      const supervisorIds = collectIdsByPredicate(node, (x) => isSupervisor(x.role));
      if (supervisorIds.length) {
        setCollapsed((prev) => {
          const next = new Set(prev);
          supervisorIds.forEach((sid) => next.add(sid));
          return next;
        });
      }
    }
  };

  const onDrillCollapse = (id: number) => {
    setDrillPath((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      return prev.slice(0, idx);
    });
  };

  const idsComFilhos = useMemo(() => {
    const s = new Set<number>();
    (filteredData || []).forEach(function walk(n: Node) {
      if (n.children?.length) s.add(n.id);
      n.children?.forEach(walk);
    });
    return s;
  }, [filteredData]);

  const collapseAll = () => {
    setCollapsed(new Set(idsComFilhos));
    setDrillPath([]);
  };
  const expandAll = () => {
    setCollapsed(new Set());
    setDrillPath([]);
  };

  const virtualRootId = 0;
  const drilledRoots = useMemo(() => {
    const selected = selectedChildMap.get(virtualRootId);
    if (!selected) return filteredData;
    return filteredData.filter((r) => r.id === selected);
  }, [filteredData, selectedChildMap]);

  // modal (mantido)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalParent, setModalParent] = useState<Node | null>(null);

  return (
    <div>
      <div className="org-title-row">
        <h2>Organograma</h2>

        {/* ✅ wrap no mobile */}
        <Space wrap>
          {drillPath.length > 0 && <Button onClick={() => setDrillPath([])}>Limpar foco</Button>}
          <Button onClick={expandAll}>Expandir tudo</Button>
          <Button onClick={collapseAll}>Recolher tudo</Button>
        </Space>
      </div>

      {isLoading ? (
        'Carregando...'
      ) : (
        <div className={`orgchart-wrapper ${isMobile ? 'is-mobile' : ''}`} ref={wrapRef}>
          <ul className={`orgchart ${isMobile ? 'orgchart-mobile' : ''}`}>
            {drilledRoots.map((root) => (
              <Branch
                key={root.id}
                n={root}
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                descCounts={descCounts}
                wrapRef={wrapRef}
                selectedChildMap={selectedChildMap}
                onDrillExpand={onDrillExpand}
                onDrillCollapse={onDrillCollapse}
                isMobile={isMobile}
              />
            ))}
          </ul>
        </div>
      )}

      <OrgChildrenModal open={modalOpen} onClose={() => setModalOpen(false)} parent={modalParent || undefined} />
    </div>
  );
}
