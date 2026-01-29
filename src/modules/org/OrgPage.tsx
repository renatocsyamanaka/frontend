import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Avatar, Button, Space } from 'antd';
import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';
import './org.css';
import { OrgChildrenModal } from './OrgChildrenModal';
import type { OrgNode as ModalNode } from './OrgChildrenModal';

type Node = ModalNode;

/* ---------------- helpers ---------------- */
function normalizeRole(role?: string | null) {
  return String(role || '').trim().toLowerCase();
}

function shouldHideFromOrg(role?: string | null) {
  const r = normalizeRole(role);
  // ✅ esconder Analista e Admin (e variantes)
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
/** ✅ Filtra a árvore inteira removendo nós e “promovendo” filhos quando necessário */
function filterTree(arr: Node[]): Node[] {
  const walk = (n: Node): Node[] => {
    const nextChildren = (n.children || []).flatMap(walk);

    if (shouldHideFromOrg(n.role)) {
      // promove filhos
      return nextChildren;
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

/** ✅ encontra o caminho (ids) até um nó: [root, ..., target] */
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

/**
 * ✅ Constrói um “mapa de seleção por nível”
 * Ex: drillPath [gerente, coordX, supY] vira:
 *   parent(gerente)->coordX
 *   parent(coordX)->supY
 */
function buildSelectedChildMap(drillPath: number[]) {
  const map = new Map<number, number>();
  for (let i = 0; i < drillPath.length - 1; i++) {
    map.set(drillPath[i], drillPath[i + 1]);
  }
  return map;
}

/** ✅ aplica o “drill-down”: se existe seleção para este pai, mostra só o filho selecionado */
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
      <Avatar size={72} src={n.avatarUrl || undefined}>
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
}: {
  n: Node;
  collapsed: Set<number>;
  setCollapsed: React.Dispatch<React.SetStateAction<Set<number>>>;
  descCounts: Map<number, number>;
  wrapRef: React.RefObject<HTMLDivElement>;

  // drill
  selectedChildMap: Map<number, number>;
  onDrillExpand: (id: number) => void;
  onDrillCollapse: (id: number) => void;
}) {
  const childrenCount = n.children?.length ?? 0;
  const hasChildren = childrenCount > 0;
  const isCollapsed = collapsed.has(n.id);
  const qtyDesc = descCounts.get(n.id) ?? 0;

  const ulRef = useRef<HTMLUListElement>(null);
  const [rowCompact, setRowCompact] = useState(false);

  // ✅ anti-tremor: mede só o wrapper com histerese + rAF
  const COMPACT_MARGIN_PX = 24;

  useEffect(() => {
    if (isCollapsed || !ulRef.current || !wrapRef.current) {
      setRowCompact(false);
      return;
    }
    if (childrenCount > 4) {
      setRowCompact(false);
      return;
    }

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
  }, [isCollapsed, childrenCount, wrapRef]);

  const handleToggle = () => {
    const willExpand = isCollapsed;

    // expand
    if (willExpand) {
      setCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(n.id);
        return next;
      });
      onDrillExpand(n.id);
      return;
    }

    // collapse
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.add(n.id);
      return next;
    });
    onDrillCollapse(n.id);
  };

  const drilledChildren = applyDrill(n.children, selectedChildMap, n.id);
  const isSup = isSupervisor(n.role);
  const grid3 = isSup && drilledChildren.length > 3;
  return (
    <li className={isCollapsed ? 'collapsed' : ''} data-node-id={n.id}>
      <div className="org-head">
        <OrgCard
          n={n}
          hasChildren={hasChildren}
          isCollapsed={isCollapsed}
          qty={qtyDesc}
          onToggle={handleToggle}
        />
      </div>

    {hasChildren && !isCollapsed && (
      <ul
        ref={ulRef}
        className={[
          (!grid3 && rowCompact) ? 'row-compact' : '',
          grid3 ? 'grid-children-3' : '',
        ].filter(Boolean).join(' ')}
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
          />
        ))}
      </ul>
    )}
    </li>
  );
}

/* ---------------- Página ---------------- */
export function OrgPage() {
  const { data, isLoading } = useQuery<Node[]>({
    queryKey: ['org'],
    queryFn: async () => (await api.get('/org/tree')).data,
  });

  // ✅ filtra (remove analista/admin)
  const filteredData = useMemo(() => filterTree(data || []), [data]);

  // colapso/expansão
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  // ✅ drill-down (controla “sumir irmãos” por nível)
  const [drillPath, setDrillPath] = useState<number[]>([]);

  // mapa parent -> child selecionado
  const selectedChildMap = useMemo(() => buildSelectedChildMap(drillPath), [drillPath]);

  // descendentes
  const descCounts = useMemo(() => collectDescCounts(filteredData || []), [filteredData]);

  // wrapper p/ medidas e scroll
  const wrapRef = useRef<HTMLDivElement>(null);

  // ✅ inicia colapsando filhos dos coordenadores (mantém sua regra)
  const [didInitCollapse, setDidInitCollapse] = useState(false);
  useEffect(() => {
    if (!filteredData?.length || didInitCollapse) return;

    const toCollapse = new Set<number>();
    const walk = (n: Node) => {
      const role = normalizeRole(n.role);
      const isCoordinator = role.includes('coorden') || role.includes('coordinator');
      if (isCoordinator && n.children?.length) toCollapse.add(n.id);
      n.children?.forEach(walk);
    };
    filteredData.forEach(walk);

    if (toCollapse.size) setCollapsed(toCollapse);
    setDidInitCollapse(true);
  }, [filteredData, didInitCollapse]);

  // ✅ quando expandir um nó: cria/atualiza drillPath até ele
const onDrillExpand = (id: number) => {
  const path = findPathToId(filteredData, id);
  if (!path) return;

  // ✅ trava drill até este nó
  setDrillPath(path);

  // ✅ se o nó expandido é COORDENADOR: colapsa supervisores abaixo dele
  const expandedNodeId = id;

  const findNode = (roots: Node[], targetId: number): Node | null => {
    const stack = [...roots];
    while (stack.length) {
      const n = stack.pop()!;
      if (n.id === targetId) return n;
      (n.children || []).forEach((c) => stack.push(c));
    }
    return null;
  };

  const node = findNode(filteredData, expandedNodeId);
  if (!node) return;

  if (isCoordinator(node.role)) {
    const supervisorIds = collectIdsByPredicate(node, (x) => isSupervisor(x.role));

    if (supervisorIds.length) {
      setCollapsed((prev) => {
        const next = new Set(prev);
        // ✅ garante supervisor COLAPSADO (pra não mostrar técnicos)
        supervisorIds.forEach((sid) => next.add(sid));
        return next;
      });
    }
  }
};

  // ✅ quando recolher um nó: remove ele e tudo abaixo do drillPath
  const onDrillCollapse = (id: number) => {
    setDrillPath((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;

      // volta para o pai (ou vazio)
      return prev.slice(0, idx);
    });
  };

  // expandir / recolher tudo
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
    setDrillPath([]); // ✅ limpa drill
  };
  const expandAll = () => {
    setCollapsed(new Set());
    setDrillPath([]); // ✅ limpa drill
  };

  // roots também sofrem drill, usando um “pai virtual” = 0
  const virtualRootId = 0;
  const drilledRoots = useMemo(() => {
    const selected = selectedChildMap.get(virtualRootId);
    if (!selected) return filteredData;

    // se você tiver múltiplas raízes e quiser drill nelas também:
    return filteredData.filter((r) => r.id === selected);
  }, [filteredData, selectedChildMap]);

  // se quiser drill nas raízes, precisamos setar virtualRoot -> root ao expandir root
  // (normalmente você só tem 1 root, então é irrelevante)

  // Modal para grupos > 4 (mantive seu modal)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalParent, setModalParent] = useState<Node | null>(null);
  const openChildrenModal = (parent: Node) => {
    setModalParent(parent);
    setModalOpen(true);
  };

  // OBS: com drill-down, geralmente não precisa abrir modal para >4,
  // mas se você quiser manter: você teria que disparar openChildrenModal
  // dentro do Branch (quando willExpand && childrenCount > 4). Aqui eu mantive
  // o componente pronto, mas o gatilho não está sendo usado.
  // Se você quiser, eu adapto o gatilho com drillPath também.

  return (
    <div>
      <div className="org-title-row">
        <h2>Organograma</h2>
        <Space>
          {drillPath.length > 0 && <Button onClick={() => setDrillPath([])}>Limpar foco</Button>}
          <Button onClick={expandAll}>Expandir tudo</Button>
          <Button onClick={collapseAll}>Recolher tudo</Button>
        </Space>
      </div>

      {isLoading ? (
        'Carregando...'
      ) : (
        <div className="orgchart-wrapper" ref={wrapRef}>
          <ul className="orgchart">
            {drilledRoots.map((root) => (
              <Branch
                key={root.id}
                n={root}
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                descCounts={descCounts}
                wrapRef={wrapRef}
                selectedChildMap={selectedChildMap}
                onDrillExpand={(id) => {
                  // se você tiver várias raízes e clicar para expandir a raiz,
                  // você pode “travar” a raiz selecionada assim:
                  // setDrillPath([root.id]) ...
                  onDrillExpand(id);
                }}
                onDrillCollapse={onDrillCollapse}
              />
            ))}
          </ul>
        </div>
      )}

      <OrgChildrenModal open={modalOpen} onClose={() => setModalOpen(false)} parent={modalParent || undefined} />
    </div>
  );
}
