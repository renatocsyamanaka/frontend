import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Card, Empty, Segmented, Spin, Typography } from 'antd';
import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';
import { api } from '../../lib/api';
import './org.css';

const { Title, Text } = Typography;

type OrgNode = {
  id: number;
  name: string;
  role?: string | null;
  roleLevel?: number | null;
  managerId?: number | null;
  avatarUrl?: string | null;
  sectors?: string[] | null;
  children?: OrgNode[];
};

type SectorFilter =
  | 'OPERACOES'
  | 'LOGISTICA'
  | 'SISTEMAS'
  | 'ATENDIMENTO';

function normalizeText(value?: string | null) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeRole(role?: string | null) {
  return normalizeText(role);
}

function normalizeSectors(value?: string[] | string | null) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return [...new Set(value.map((s) => normalizeText(s)).filter(Boolean))];
  }

  return [
    ...new Set(
      String(value)
        .split(',')
        .map((s) => normalizeText(s))
        .filter(Boolean)
    ),
  ];
}

function absImage(url?: string | null) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;

  const base = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
  const path = String(url).startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}

function hasSector(node: OrgNode, sector: SectorFilter) {
  return normalizeSectors(node.sectors).includes(sector);
}

function isDirector(role?: string | null) {
  return normalizeRole(role).includes('DIRETOR');
}

function isHiddenRole(role?: string | null) {
  const r = normalizeRole(role);
  return r.includes('ADMIN');
}

function roleWeight(role?: string | null, level?: number | null) {
  const r = normalizeRole(role);
  if (r.includes('DIRETOR')) return 600;
  if (r.includes('GERENTE')) return 500;
  if (r.includes('COORDENADOR')) return 400;
  if (r.includes('SUPERVISOR')) return 300;
  if (r.includes('ANALISTA')) return 200;
  if (
    r.includes('TECNICO') ||
    r.includes('PSO') ||
    r.includes('SPOT') ||
    r.includes('PRP')
  ) {
    return 100;
  }
  return Number(level || 0);
}

function sortTree(nodes: OrgNode[]): OrgNode[] {
  const sorted = [...nodes].sort((a, b) => {
    const diff =
      roleWeight(b.role, b.roleLevel) - roleWeight(a.role, a.roleLevel);
    if (diff !== 0) return diff;
    return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
  });

  return sorted.map((n) => ({
    ...n,
    children: sortTree(n.children || []),
  }));
}

function dedupeTree(nodes: OrgNode[]): OrgNode[] {
  const seen = new Set<number>();

  const walk = (node: OrgNode): OrgNode | null => {
    if (seen.has(node.id)) return null;
    seen.add(node.id);

    const children = (node.children || [])
      .map(walk)
      .filter(Boolean) as OrgNode[];

    return {
      ...node,
      children,
    };
  };

  return nodes.map(walk).filter(Boolean) as OrgNode[];
}

function pruneHiddenRoles(nodes: OrgNode[]): OrgNode[] {
  const walk = (node: OrgNode): OrgNode[] => {
    const nextChildren = (node.children || []).flatMap(walk);

    if (isHiddenRole(node.role)) {
      return nextChildren;
    }

    return [{ ...node, children: nextChildren }];
  };

  return nodes.flatMap(walk);
}

function filterTreeBySector(nodes: OrgNode[], sector: SectorFilter): OrgNode[] {
  const walk = (node: OrgNode): OrgNode | null => {
    const nextChildren = (node.children || [])
      .map(walk)
      .filter(Boolean) as OrgNode[];

    const matches = hasSector(node, sector) || isDirector(node.role);

    if (matches || nextChildren.length > 0) {
      return {
        ...node,
        children: nextChildren,
      };
    }

    return null;
  };

  return nodes.map(walk).filter(Boolean) as OrgNode[];
}

function countDescendants(node: OrgNode): number {
  const children = node.children || [];
  let total = children.length;
  for (const child of children) total += countDescendants(child);
  return total;
}

/**
 * Abre somente a raiz.
 * Gerentes/coordenadores aparecem porque são filhos visíveis do diretor,
 * mas continuam fechados.
 */
function collectInitialOpenIds(nodes: OrgNode[]) {
  const openIds = new Set<number>();

  for (const root of nodes) {
    openIds.add(root.id);
  }

  return openIds;
}

/**
 * Se houver algum filho expandido nesse nível, mostra somente os expandidos.
 * Se ninguém estiver expandido, mostra todos.
 */
function getVisibleChildren(children: OrgNode[], expanded: Set<number>) {
  const expandedChildren = children.filter((c) => expanded.has(c.id));
  return expandedChildren.length > 0 ? expandedChildren : children;
}

function OrgClassicNode({
  node,
  expanded,
  onToggle,
}: {
  node: OrgNode;
  expanded: Set<number>;
  onToggle: (id: number) => void;
}) {
  const allChildren = node.children || [];
  const hasChildren = allChildren.length > 0;
  const isOpen = expanded.has(node.id);
  const totalBelow = countDescendants(node);

  const visibleChildren = hasChildren ? getVisibleChildren(allChildren, expanded) : [];
  const showConnectorToChildren =
    hasChildren && isOpen && visibleChildren.length > 0;

  return (
    <div className="org-block">
      <div className="org-classic-card">
        <div className="org-classic-card-left">
          <Avatar
            className="org-classic-avatar"
            size={56}
            src={absImage(node.avatarUrl)}
          >
            {node.name?.[0]}
          </Avatar>

          <div className="org-classic-meta">
            <div className="org-classic-name">{node.name}</div>
            <div className="org-classic-role">{node.role || 'Sem cargo'}</div>
          </div>
        </div>

        {hasChildren && (
          <button
            className="org-classic-toggle"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
          >
            {isOpen ? <CaretDownOutlined /> : <CaretRightOutlined />}
            <span>{totalBelow}</span>
          </button>
        )}
      </div>

      {showConnectorToChildren && <div className="org-connector-vertical" />}

      {showConnectorToChildren && (
        <div
          className={`org-children-grid ${
            visibleChildren.length > 4 ? 'cols-4' : ''
          }`}
        >
          {visibleChildren.map((child) => (
            <div key={child.id} className="org-child-col">
              <OrgClassicNode
                node={child}
                expanded={expanded}
                onToggle={onToggle}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function OrgPage() {
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>('OPERACOES');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery<OrgNode[]>({
    queryKey: ['org-tree'],
    queryFn: async () => (await api.get('/org/tree')).data,
  });

  const visibleRoots = useMemo(() => {
    const base = Array.isArray(data) ? data : [];
    const bySector = filterTreeBySector(base, sectorFilter);
    const withoutHidden = pruneHiddenRoles(bySector);
    const unique = dedupeTree(withoutHidden);
    return sortTree(unique);
  }, [data, sectorFilter]);

  useEffect(() => {
    setExpanded(collectInitialOpenIds(visibleRoots));
  }, [visibleRoots]);

  const toggleNode = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="org-classic-page">
      <div className="org-classic-header">
        <div>
          <Title level={3} style={{ marginBottom: 8 }}>
            Organograma 
          </Title>
        </div>

        <Segmented
          value={sectorFilter}
          onChange={(v) => setSectorFilter(v as SectorFilter)}
          options={[
            { label: 'Operações', value: 'OPERACOES' },
            { label: 'Logística', value: 'LOGISTICA' },
            { label: 'Sistemas', value: 'SISTEMAS' },
            { label: 'Atendimento', value: 'ATENDIMENTO' },
          ]}
        />
      </div>

      {isLoading ? (
        <div className="org-classic-loading">
          <Spin />
        </div>
      ) : visibleRoots.length === 0 ? (
        <Card>
          <Empty description="Nenhum colaborador encontrado nesta área." />
        </Card>
      ) : (
        <div className="org-no-scroll-wrapper">
          {visibleRoots.map((root) => (
            <OrgClassicNode
              key={root.id}
              node={root}
              expanded={expanded}
              onToggle={toggleNode}
            />
          ))}
        </div>
      )}
    </div>
  );
}